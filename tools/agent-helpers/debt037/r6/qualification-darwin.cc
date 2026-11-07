/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/qualification-darwin.cc
 * 🎯 Purpose: Reads actual ownership-ignored and snapshot mount flags from held objects.
 * 🧠 Responsibilities: Keeps flag-query errors distinct from known false values.
 * 🏗️ Architecture: Test-only adapter using existing public Darwin SDK definitions.
 * ⚠️ Important: APFS/local flags and ownership-enabled are not complete ACL qualification.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "qualification-proof.h"
#include <cerrno>
#include <sys/param.h>
#include <sys/mount.h>
#include <unistd.h>
#include <stdexcept>
namespace dss::storage::qualification_proof {
namespace {
Fact Flag(std::uint64_t bits, std::uint64_t bit, bool complete) {
  return complete ? Present((bits & bit) != 0) : Unavailable(EPROTO);
}
}
Evidence ObservePlatform(const NativeObject& object) {
  Evidence result;
  struct statfs flags {};
  if (::fstatfs(static_cast<int>(object.handle()), &flags) != 0) {
    result.read_only = result.ownership_ignored = result.snapshot = Unavailable(static_cast<std::uint32_t>(errno));
    return result;
  }
  result.read_only = Flag(flags.f_flags, MNT_RDONLY, true);
#if defined(MNT_IGNORE_OWNERSHIP)
  result.ownership_ignored = Flag(flags.f_flags, MNT_IGNORE_OWNERSHIP, true);
#else
  result.ownership_ignored = Unsupported(ENOTSUP);
#endif
#if defined(MNT_SNAPSHOT)
  result.snapshot = Flag(flags.f_flags, MNT_SNAPSHOT, true);
#else
  result.snapshot = Unsupported(ENOTSUP);
#endif
  result.remote_device = Present((flags.f_flags & MNT_LOCAL) == 0);
  return result;
}
bool DecoderControls() {
  if (Flag(1, 1, true).value != 1 || Flag(0, 1, true).value != 0 ||
      Flag(1, 1, false).state != State::Unavailable) throw std::runtime_error("flag decoder");
  return true;
}
bool OrdinaryContext() {
  if (::getuid() == 0 || ::getgid() == 0 || ::getuid() != ::geteuid() || ::getgid() != ::getegid()) return false;
  errno = 0;
  return ::setuid(0) == -1 && errno == EPERM;
}
}  // namespace dss::storage::qualification_proof
