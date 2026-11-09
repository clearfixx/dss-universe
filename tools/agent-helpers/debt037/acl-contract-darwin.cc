/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable POSIX ACL Contract Proof
 * 📄 File: tools/agent-helpers/debt037/acl-contract-darwin.cc
 * 🎯 Purpose: Compares public Darwin ACL/stat/property/attribute observations.
 * 🧠 Responsibilities: Keeps incomplete or omitted evidence distinct from verified absence.
 * 🏗️ Architecture: Test-only public system API probe; no FILESEC_ACL_RAW access.
 * ⚠️ Important: Setter controls mutate only new harness-owned fixtures, never uploads.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "acl-contract-proof.h"
#include <cerrno>
#include <cstdint>
#include <cstring>
#include <fcntl.h>
#include <membership.h>
#include <sys/acl.h>
#include <sys/attr.h>
#include <sys/stat.h>
#include <uuid/uuid.h>
#include <unistd.h>

namespace dss::proof {
namespace {
struct OwnedAcl { acl_t value; ~OwnedAcl() { if (value) ::acl_free(value); } };
struct OwnedFilesec { filesec_t value; ~OwnedFilesec() { if (value) ::filesec_free(value); } };
int Count(acl_t acl) {
  if (!acl || ::acl_valid(acl) != 0) return -1;
  int next = ACL_FIRST_ENTRY;
  for (int count = 0; count <= 4096; ++count) {
    acl_entry_t entry;
    errno = 0;
    const int rc = ::acl_get_entry(acl, next, &entry);
    if (rc == -1 && errno == EINVAL) return count;
    if (rc != 0) return -1;
    next = ACL_NEXT_ENTRY;
  }
  return -1;
}
void Attributes(int fd, Observation& result) {
  struct attrlist request {};
  request.bitmapcount = ATTR_BIT_MAP_COUNT;
  request.commonattr = ATTR_CMN_RETURNED_ATTRS | ATTR_CMN_EXTENDED_SECURITY;
  alignas(8) unsigned char bytes[16384] {};
  errno = 0;
  result.attrs_rc = ::fgetattrlist(fd, &request, bytes, sizeof(bytes), 0);
  result.attrs_error = result.attrs_rc < 0 ? errno : 0;
  if (result.attrs_rc != 0) return;
  std::uint32_t length;
  std::memcpy(&length, bytes, sizeof(length));
  if (length < sizeof(length) + sizeof(attribute_set_t) || length > sizeof(bytes)) return;
  attribute_set_t returned {};
  std::memcpy(&returned, bytes + sizeof(length), sizeof(returned));
  if ((returned.commonattr & ATTR_CMN_RETURNED_ATTRS) == 0) return;
  result.attrs_complete = 1;
  result.attrs_security_returned = (returned.commonattr & ATTR_CMN_EXTENDED_SECURITY) != 0 ? 1 : 0;
  if (!result.attrs_security_returned) return;
  const std::size_t offset = sizeof(length) + sizeof(returned);
  if (offset + sizeof(attrreference_t) > length) { result.attrs_complete = 0; return; }
  attrreference_t reference {};
  std::memcpy(&reference, bytes + offset, sizeof(reference));
  const auto start = static_cast<std::int64_t>(offset) + reference.attr_dataoffset;
  const auto end = start + reference.attr_length;
  if (start < 0 || end < start || end > length || reference.attr_length > sizeof(bytes)) {
    result.attrs_complete = 0; return;
  }
  result.attrs_security_length = static_cast<int>(reference.attr_length);
}
}
const char* Platform() { return "darwin"; }
int SetControl(int fd, Control control, uid_t attacker) {
  OwnedAcl acl {::acl_init(control == Control::Empty ? 0 : 1)};
  if (!acl.value) return -1;
  if (control != Control::Empty) {
    uuid_t identity;
    const int converted = ::mbr_uid_to_uuid(attacker, identity);
    if (converted != 0) { errno = converted; return -1; }
    acl_entry_t entry;
    if (::acl_create_entry(&acl.value, &entry) != 0 ||
        ::acl_set_tag_type(entry, control == Control::NamedDeny ? ACL_EXTENDED_DENY : ACL_EXTENDED_ALLOW) != 0 ||
        ::acl_set_qualifier(entry, identity) != 0) return -1;
    acl_permset_t permissions;
    if (::acl_get_permset(entry, &permissions) != 0 ||
        ::acl_add_perm(permissions, ACL_ADD_FILE) != 0 ||
        ::acl_add_perm(permissions, ACL_SEARCH) != 0 ||
        ::acl_set_permset(entry, permissions) != 0) return -1;
    if (control == Control::InheritedAllow) {
      acl_flagset_t flags;
      if (::acl_get_flagset_np(entry, &flags) != 0 ||
          ::acl_add_flag_np(flags, ACL_ENTRY_DIRECTORY_INHERIT) != 0 ||
          ::acl_add_flag_np(flags, ACL_ENTRY_FILE_INHERIT) != 0 ||
          ::acl_add_flag_np(flags, ACL_ENTRY_ONLY_INHERIT) != 0 ||
          ::acl_set_flagset_np(entry, flags) != 0) return -1;
    }
  }
  return ::acl_set_fd_np(fd, acl.value, ACL_TYPE_EXTENDED);
}
Observation ObserveAcl(int fd) {
  Observation result;
  struct stat info {};
  errno = 0;
  result.stat_rc = ::fstat(fd, &info);
  result.stat_error = result.stat_rc < 0 ? errno : 0;
  if (result.stat_rc == 0) result.mode = static_cast<int>(info.st_mode & 0777);
  errno = 0;
  OwnedAcl acl {::acl_get_fd_np(fd, ACL_TYPE_EXTENDED)};
  result.acl_rc = acl.value ? 0 : -1;
  result.acl_error = acl.value ? 0 : errno;
  if (acl.value) result.acl_entries = Count(acl.value);
  OwnedFilesec security {::filesec_init()};
  if (!security.value) { result.statx_rc = -1; result.statx_error = errno; }
  else {
    errno = 0;
    result.statx_rc = ::fstatx_np(fd, &info, security.value);
    result.statx_error = result.statx_rc < 0 ? errno : 0;
    if (result.statx_rc == 0) {
      errno = 0;
      result.property_query_rc = ::filesec_query_property(security.value, FILESEC_ACL, &result.property_present);
      result.property_query_error = result.property_query_rc < 0 ? errno : 0;
      acl_t copied = nullptr;
      errno = 0;
      result.property_get_rc = ::filesec_get_property(security.value, FILESEC_ACL, &copied);
      result.property_get_error = result.property_get_rc < 0 ? errno : 0;
      OwnedAcl property {copied};
      if (result.property_get_rc == 0) result.property_entries = Count(property.value);
    }
  }
  Attributes(fd, result);
  return result;
}
}  // namespace dss::proof
