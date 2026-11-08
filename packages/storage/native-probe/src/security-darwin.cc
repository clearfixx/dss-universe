/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/src/security-darwin.cc
 * 🎯 Purpose: Reads copied Darwin extended ACLs through captured descriptors.
 * 🧠 Responsibilities: Bounds validated ACL iteration and releases every returned allocation.
 * 🏗️ Architecture: Private native infrastructure; no application dependencies.
 * ⚠️ Important: NULL/ENOENT is not treated as verified absence; no Linux ACL assumptions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <cerrno>
#include <sys/acl.h>

namespace dss::storage::probe {
namespace {
struct OwnedAcl {
  acl_t value;
  ~OwnedAcl() { if (value != nullptr) ::acl_free(value); }
};
AclEvidence ReadAcl(int fd) {
  AclEvidence result;
  result.format = "darwin-extended-acl";
  errno = 0;
  OwnedAcl acl {::acl_get_fd_np(fd, ACL_TYPE_EXTENDED)};
  if (acl.value == nullptr) {
    const int error = errno;
    result.os_code = static_cast<std::uint32_t>(error);
    result.state = error == EOPNOTSUPP || error == ENOTSUP ? EvidenceState::Unsupported : EvidenceState::Unavailable;
    return result;
  }
  if (::acl_valid(acl.value) != 0) { result.os_code = static_cast<std::uint32_t>(errno); return result; }
  int next = ACL_FIRST_ENTRY;
  for (std::uint32_t count = 0; count <= 4096; ++count) {
    acl_entry_t entry;
    errno = 0;
    const int status = ::acl_get_entry(acl.value, next, &entry);
    const int error = errno;
    if (status == -1 && error == EINVAL) {
      // Darwin documents EINVAL for NEXT after the last entry. The copied ACL
      // was validated and is never mutated while being enumerated.
      result.state = count == 0 ? EvidenceState::VerifiedAbsent : EvidenceState::Present;
      result.shape = count == 0 ? "empty-extended-acl" : "entries";
      result.entries_known = true;
      result.entries = count;
      return result;
    }
    if (status != 0) { result.os_code = static_cast<std::uint32_t>(error ? error : EINVAL); return result; }
    acl_tag_t tag;
    if (::acl_get_tag_type(entry, &tag) != 0) { result.os_code = static_cast<std::uint32_t>(errno); return result; }
    if (tag != ACL_EXTENDED_ALLOW && tag != ACL_EXTENDED_DENY) result.unknown_entry_types = true;
    acl_flagset_t flags;
    if (::acl_get_flagset_np(entry, &flags) != 0) { result.os_code = static_cast<std::uint32_t>(errno); return result; }
    const acl_flag_t kinds[] = {ACL_ENTRY_INHERITED, ACL_ENTRY_FILE_INHERIT, ACL_ENTRY_DIRECTORY_INHERIT};
    for (const auto flag : kinds) {
      errno = 0;
      const int observed = ::acl_get_flag_np(flags, flag);
      if (observed < 0) { result.os_code = static_cast<std::uint32_t>(errno); return result; }
      result.inheritance_observed = result.inheritance_observed || observed != 0;
    }
    next = ACL_NEXT_ENTRY;
  }
  result.os_code = E2BIG;
  return result;
}
}
SecurityEvidence ReadSecurity(const NativeObject& object) {
  auto result = ReadPosixSecurityBase(object);
  result.acl = ReadAcl(static_cast<int>(object.handle()));
  return result;
}
}  // namespace dss::storage::probe
