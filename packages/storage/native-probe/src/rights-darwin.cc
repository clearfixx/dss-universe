/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-darwin.cc
 * 🎯 Purpose: Acquires complete descriptor-bound native ACLs before public import.
 * 🧠 Responsibilities: Bounds SDK structures, preserves omitted attributes, owns ACL allocations.
 * 🏗️ Architecture: Darwin-only adapter; no private syscall or target pathname fallback.
 * ⚠️ Important: ACL/mode grants are a conditional model, not filesystem qualification.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include "rights-posix.h"
#include "rights-darwin.h"
#include <cerrno>
#include <cstring>
#include <fcntl.h>
#include <membership.h>
#include <sys/acl.h>
#include <sys/attr.h>
#include <unistd.h>
#include <uuid/uuid.h>

namespace dss::storage::probe {
namespace {
struct OwnedAcl { acl_t value; ~OwnedAcl() { if (value) ::acl_free(value); } };
RightsCheck Failure(int error) {
  return {error == ENOTSUP || error == EOPNOTSUPP ? RightsState::Unsupported : RightsState::Unavailable,
      "darwin-acl-unresolved", static_cast<std::uint32_t>(error)};
}
DarwinAclFacts Invalid() { return {Failure(EINVAL), 0, 0}; }
DarwinAclFacts Unsupported() { return {{RightsState::Unsupported, "unsupported-darwin-acl-model", ENOTSUP}, 0, 0}; }
std::uint32_t Risks(std::uint32_t mask) {
  std::uint32_t result = 0;
  if (mask & ACL_LIST_DIRECTORY) result |= ReadContent;
  if (mask & (ACL_ADD_FILE | ACL_ADD_SUBDIRECTORY)) result |= ChangeNamespace;
  if (mask & (ACL_WRITE_ATTRIBUTES | ACL_WRITE_EXTATTRIBUTES | ACL_WRITE_SECURITY | ACL_CHANGE_OWNER)) result |= ChangeMetadata;
  if (mask & ACL_DELETE) result |= DeleteObject;
  if (mask & ACL_DELETE_CHILD) result |= DeleteChild;
  if (mask & ACL_SEARCH) result |= Traverse;
  return result;
}
DarwinAclFacts Acquire(int fd, uid_t service) {
  struct attrlist request {};
  request.bitmapcount = ATTR_BIT_MAP_COUNT;
  request.commonattr = ATTR_CMN_RETURNED_ATTRS | ATTR_CMN_EXTENDED_SECURITY;
  alignas(std::max_align_t) unsigned char bytes[16384] {};
  if (::fgetattrlist(fd, &request, bytes, sizeof(bytes), 0) != 0) return {Failure(errno), 0, 0};
  std::uint32_t length = 0;
  std::memcpy(&length, bytes, sizeof(length));
  const std::size_t offset = sizeof(length) + sizeof(attribute_set_t);
  if (length < offset || length > sizeof(bytes)) return Invalid();
  attribute_set_t returned {};
  std::memcpy(&returned, bytes + sizeof(length), sizeof(returned));
  if (!(returned.commonattr & ATTR_CMN_RETURNED_ATTRS) ||
      (returned.commonattr & ~(ATTR_CMN_RETURNED_ATTRS | ATTR_CMN_EXTENDED_SECURITY)) ||
      returned.volattr || returned.dirattr || returned.fileattr || returned.forkattr) return Unsupported();
  if (!(returned.commonattr & ATTR_CMN_EXTENDED_SECURITY)) return {Failure(ENOENT), 0, 0};
  if (offset + sizeof(attrreference_t) > length) return Invalid();
  attrreference_t reference {};
  std::memcpy(&reference, bytes + offset, sizeof(reference));
  const auto start = static_cast<std::int64_t>(offset) + reference.attr_dataoffset;
  if (start < static_cast<std::int64_t>(offset + sizeof(reference)) || start > length ||
      reference.attr_length > length - static_cast<std::size_t>(start)) return Invalid();
  return DecodeDarwinAcl(bytes + start, reference.attr_length, service);
}
}
DarwinAclFacts DecodeDarwinAcl(const unsigned char* bytes, std::size_t length, uid_t service) {
  constexpr std::size_t header_size = KAUTH_FILESEC_SIZE(0);
  if (!bytes || length < header_size || length > 65536) return Invalid();
  struct kauth_filesec header {};
  static_assert(header_size <= sizeof(header));
  std::memcpy(&header, bytes, header_size);
  if (header.fsec_magic != KAUTH_FILESEC_MAGIC || header.fsec_entrycount > ACL_MAX_ENTRIES ||
      length != header_size + static_cast<std::size_t>(header.fsec_entrycount) * sizeof(struct kauth_ace)) return Invalid();
  if (header.fsec_flags & ~static_cast<std::uint32_t>(KAUTH_FILESEC_NO_INHERIT)) return Unsupported();
  constexpr std::uint32_t known_flags = KAUTH_ACE_KINDMASK | KAUTH_ACE_INHERITED | KAUTH_ACE_FILE_INHERIT |
      KAUTH_ACE_DIRECTORY_INHERIT | KAUTH_ACE_LIMIT_INHERIT | KAUTH_ACE_ONLY_INHERIT;
  constexpr std::uint32_t known_rights = ACL_LIST_DIRECTORY | ACL_ADD_FILE | ACL_SEARCH | ACL_DELETE |
      ACL_ADD_SUBDIRECTORY | ACL_DELETE_CHILD | ACL_READ_ATTRIBUTES | ACL_WRITE_ATTRIBUTES |
      ACL_READ_EXTATTRIBUTES | ACL_WRITE_EXTATTRIBUTES | ACL_READ_SECURITY | ACL_WRITE_SECURITY |
      ACL_CHANGE_OWNER | ACL_SYNCHRONIZE;
  uuid_t service_id, root_id;
  int error = ::mbr_uid_to_uuid(service, service_id);
  if (error != 0) return {Failure(error), 0, 0};
  error = ::mbr_uid_to_uuid(0, root_id);
  if (error != 0) return {Failure(error), 0, 0};
  DarwinAclFacts result {{RightsState::Satisfied, "validated-darwin-allow-model", 0}, 0, 0};
  for (std::uint32_t index = 0; index < header.fsec_entrycount; ++index) {
    struct kauth_ace entry {};
    std::memcpy(&entry, bytes + header_size + index * sizeof(entry), sizeof(entry));
    const auto kind = entry.ace_flags & KAUTH_ACE_KINDMASK;
    if ((entry.ace_flags & ~known_flags) || (entry.ace_rights & ~known_rights) ||
        (kind != KAUTH_ACE_PERMIT && kind != KAUTH_ACE_DENY)) return Unsupported();
    const auto* identity = reinterpret_cast<const unsigned char*>(&entry.ace_applicable);
    if (uuid_is_null(identity)) return Unsupported();
    if (kind == KAUTH_ACE_DENY) continue; // Intentionally no subtractive deny credit.
    if (uuid_compare(identity, service_id) == 0 || uuid_compare(identity, root_id) == 0) continue;
    const auto risks = Risks(entry.ace_rights);
    if (!(entry.ace_flags & KAUTH_ACE_ONLY_INHERIT)) result.current |= risks;
    if (entry.ace_flags & (KAUTH_ACE_FILE_INHERIT | KAUTH_ACE_DIRECTORY_INHERIT)) result.inherited |= risks;
  }
  // Import only after the full declared extent and each supported entry are bounded.
  std::vector<std::max_align_t> aligned((length + sizeof(std::max_align_t) - 1) / sizeof(std::max_align_t));
  std::memcpy(aligned.data(), bytes, length);
  OwnedAcl imported {::acl_copy_int_native(aligned.data())};
  if (!imported.value || ::acl_valid(imported.value) != 0) return {Failure(errno ? errno : EINVAL), 0, 0};
  for (std::uint32_t index = 0; index <= header.fsec_entrycount; ++index) {
    acl_entry_t entry;
    errno = 0;
    const int status = ::acl_get_entry(imported.value, index == 0 ? ACL_FIRST_ENTRY : ACL_NEXT_ENTRY, &entry);
    if (index == header.fsec_entrycount) {
      if (status != -1 || errno != EINVAL) return Invalid();
    } else {
      acl_tag_t tag;
      if (status != 0 || ::acl_get_tag_type(entry, &tag) != 0 ||
          (tag != ACL_EXTENDED_ALLOW && tag != ACL_EXTENDED_DENY)) return Invalid();
    }
  }
  return result;
}
RightsFacts ReadDirectoryRights(const NativeObject& object, DirectoryRole role, const RightsContext& context) {
  if (context.kind() != RightsContextKind::Posix) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT");
  const auto* posix = static_cast<const PosixRightsContext*>(&context);
  auto result = ReadPosixDirectoryBase(object, *posix);
  const int fd = static_cast<int>(object.handle());
  const int access = ::faccessat(fd, ".", RequiredPosixAccess(role), AT_EACCESS);
  result.service_access = PosixAccessResult(access, access == 0 ? 0 : errno);
  const auto acl = Acquire(fd, posix->user());
  result.acl_metadata = result.grants = result.inheritance = acl.check;
  result.current_risks |= acl.current;
  result.inherited_risks = acl.inherited;
  return result;
}
}  // namespace dss::storage::probe
