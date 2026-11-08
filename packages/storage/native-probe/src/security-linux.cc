/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/src/security-linux.cc
 * 🎯 Purpose: Reads bounded Linux access/default ACL xattr evidence.
 * 🧠 Responsibilities: Checks the kernel wire shape and preserves ambiguous absence/errors.
 * 🏗️ Architecture: Private native infrastructure; no application dependencies.
 * ⚠️ Important: ENODATA is unavailable evidence, never silently verified ACL absence.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <cerrno>
#include <sys/xattr.h>

namespace dss::storage::probe {
namespace {
std::uint16_t Le16(const unsigned char* bytes) {
  return static_cast<std::uint16_t>(bytes[0] | (static_cast<std::uint16_t>(bytes[1]) << 8));
}
std::uint32_t Le32(const unsigned char* bytes) {
  return static_cast<std::uint32_t>(Le16(bytes)) | (static_cast<std::uint32_t>(Le16(bytes + 2)) << 16);
}
AclEvidence ReadAcl(int fd, const char* name, bool is_default) {
  AclEvidence result;
  result.format = "linux-posix-acl-xattr-v2";
  const ssize_t size = ::fgetxattr(fd, name, nullptr, 0);
  if (size < 0) {
    const int error = errno;
    result.os_code = static_cast<std::uint32_t>(error);
    result.state = error == ENOTSUP ? EvidenceState::Unsupported : EvidenceState::Unavailable;
    return result;
  }
  if (size < 4 || size > 65536 || (size - 4) % 8 != 0) {
    result.os_code = EINVAL;
    return result;
  }
  std::vector<unsigned char> bytes(static_cast<std::size_t>(size));
  const ssize_t read = ::fgetxattr(fd, name, bytes.data(), bytes.size());
  if (read < 0) {
    const int error = errno;
    result.os_code = static_cast<std::uint32_t>(error);
    result.state = error == ENOTSUP ? EvidenceState::Unsupported : EvidenceState::Unavailable;
    return result;
  }
  if (read != size || Le32(bytes.data()) != 2) { result.os_code = EINVAL; return result; }
  unsigned owner = 0, group = 0, other = 0, mask = 0, named = 0;
  for (std::size_t offset = 4; offset < bytes.size(); offset += 8) {
    const auto tag = Le16(bytes.data() + offset);
    const auto perm = Le16(bytes.data() + offset + 2);
    const auto id = Le32(bytes.data() + offset + 4);
    if ((perm & ~7U) != 0) { result.os_code = EINVAL; return result; }
    switch (tag) {
      case 1: ++owner; break;
      case 4: ++group; break;
      case 32: ++other; break;
      case 16: ++mask; break;
      case 2: case 8: ++named; break;
      default: result.os_code = EINVAL; return result;
    }
    if (((tag == 2 || tag == 8) && id == 0xffffffffU) ||
        ((tag != 2 && tag != 8) && id != 0xffffffffU)) {
      result.os_code = EINVAL; return result;
    }
  }
  if (owner != 1 || group != 1 || other != 1 || mask > 1 || (named > 0 && mask != 1)) {
    result.os_code = EINVAL; return result;
  }
  result.state = EvidenceState::Present;
  result.shape = "entries";
  result.entries_known = true;
  result.entries = static_cast<std::uint32_t>((bytes.size() - 4) / 8);
  result.inheritance_observed = is_default;
  return result;
}
}
SecurityEvidence ReadSecurity(const NativeObject& object) {
  auto result = ReadPosixSecurityBase(object);
  const int fd = static_cast<int>(object.handle());
  result.acl = ReadAcl(fd, "system.posix_acl_access", false);
  result.default_acl_applicable = true;
  result.default_acl = ReadAcl(fd, "system.posix_acl_default", true);
  return result;
}
}  // namespace dss::storage::probe
