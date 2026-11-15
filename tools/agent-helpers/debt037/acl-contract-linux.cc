/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable POSIX ACL Contract Proof
 * 📄 File: tools/agent-helpers/debt037/acl-contract-linux.cc
 * 🎯 Purpose: Builds synthetic Linux ACL mask/default controls and observes actual xattrs.
 * 🧠 Responsibilities: Records real errors and entry counts without inferring absence.
 * 🏗️ Architecture: Test-only OS adapter using existing kernel interfaces.
 * ⚠️ Important: Only descriptors created by the guarded proof harness are mutated.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "acl-contract-proof.h"
#include <cerrno>
#include <cstdint>
#include <vector>
#include <sys/stat.h>
#include <sys/xattr.h>

namespace dss::proof {
namespace {
void U16(std::vector<unsigned char>& out, std::uint16_t value) {
  out.push_back(static_cast<unsigned char>(value)); out.push_back(static_cast<unsigned char>(value >> 8));
}
void U32(std::vector<unsigned char>& out, std::uint32_t value) {
  U16(out, static_cast<std::uint16_t>(value)); U16(out, static_cast<std::uint16_t>(value >> 16));
}
void Entry(std::vector<unsigned char>& out, std::uint16_t tag, std::uint16_t perms, std::uint32_t id) {
  U16(out, tag); U16(out, perms); U32(out, id);
}
void Query(int fd, const char* key, int& rc, int& error, int& count) {
  unsigned char bytes[4096] {};
  errno = 0;
  const auto size = ::fgetxattr(fd, key, bytes, sizeof(bytes));
  error = size < 0 ? errno : 0;
  rc = size < 0 ? -1 : 0;
  if (size >= 4 && (size - 4) % 8 == 0 && bytes[0] == 2 && bytes[1] == 0 && bytes[2] == 0 && bytes[3] == 0)
    count = static_cast<int>((size - 4) / 8);
}
}
const char* Platform() { return "linux"; }
int SetControl(int fd, Control control, uid_t attacker) {
  std::vector<unsigned char> bytes;
  U32(bytes, 2);
  const char* key = control == Control::Empty || control == Control::InheritedAllow ?
      "system.posix_acl_default" : "system.posix_acl_access";
  if (control != Control::Empty) {
    if (control == Control::NamedDeny) { errno = EINVAL; return -1; }
    Entry(bytes, 1, 7, 0xffffffffU);
    Entry(bytes, 2, 7, static_cast<std::uint32_t>(attacker));
    Entry(bytes, 4, 0, 0xffffffffU);
    Entry(bytes, 16, control == Control::MaskZero ? 0 : 7, 0xffffffffU);
    Entry(bytes, 32, 0, 0xffffffffU);
  }
  return ::fsetxattr(fd, key, bytes.data(), bytes.size(), 0);
}
Observation ObserveAcl(int fd) {
  Observation result;
  struct stat info {};
  errno = 0;
  result.stat_rc = ::fstat(fd, &info);
  result.stat_error = result.stat_rc < 0 ? errno : 0;
  if (result.stat_rc == 0) result.mode = static_cast<int>(info.st_mode & 0777);
  Query(fd, "system.posix_acl_access", result.acl_rc, result.acl_error, result.acl_entries);
  Query(fd, "system.posix_acl_default", result.default_rc, result.default_error, result.default_entries);
  return result;
}
}  // namespace dss::proof
