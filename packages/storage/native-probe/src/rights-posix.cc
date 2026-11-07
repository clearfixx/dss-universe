/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-posix.cc
 * 🎯 Purpose: Captures stable ordinary POSIX context and descriptor owner/mode facts.
 * 🧠 Responsibilities: Checks real/effective/groups and Linux filesystem credentials without setters.
 * 🏗️ Architecture: Shared Linux/Darwin observation adapter, separate from the pure role model.
 * ⚠️ Important: Kernel context observations are fresh/non-atomic and do not qualify identity domains.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include "rights-posix.h"
#include <algorithm>
#include <cerrno>
#include <fcntl.h>
#include <sstream>
#include <sys/stat.h>
#include <unistd.h>
#if defined(__linux__)
#include <sys/vfs.h>
#include <linux/magic.h>
#endif

namespace dss::storage::probe {
namespace {
PosixCredentialFrame Frame() {
#if defined(__APPLE__)
  uid_t thread_user = 0;
  gid_t thread_group = 0;
  errno = 0;
  const int thread_result = ::pthread_getugid_np(&thread_user, &thread_group);
  if (thread_result == 0 || errno != ESRCH)
    throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", thread_result == 0 ? ENOTSUP : errno);
#endif
  PosixCredentialFrame result {::getuid(), ::geteuid(), ::getgid(), ::getegid(), {}};
  if (result.uid != result.effective_uid || result.gid != result.effective_gid)
    throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", ENOTSUP);
  const int count = ::getgroups(0, nullptr);
  if (count < 0 || count > 65536) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", errno);
  result.groups.resize(static_cast<std::size_t>(count));
  if (::getgroups(count, result.groups.data()) != count)
    throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", EAGAIN);
  std::sort(result.groups.begin(), result.groups.end());
#if defined(__linux__)
  // Verify the filesystem credentials actually used by this worker. Never call a credential setter to query them.
  const int fd = ::open("/proc/thread-self/status", O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", errno);
  struct OwnedFd { int value; ~OwnedFd() { ::close(value); } } owned {fd};
  struct statfs fs {};
  if (::fstatfs(fd, &fs) != 0 || fs.f_type != PROC_SUPER_MAGIC)
    throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", ENOTSUP);
  std::string text;
  char buffer[4096];
  for (;;) {
    const auto size = ::read(fd, buffer, sizeof(buffer));
    if (size < 0 && errno == EINTR) continue;
    if (size < 0 || text.size() + static_cast<std::size_t>(size) > 65536)
      throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", EIO);
    if (!size) break;
    text.append(buffer, static_cast<std::size_t>(size));
  }
  bool uid_checked = false, gid_checked = false;
  std::istringstream lines(text);
  std::string line;
  while (std::getline(lines, line)) {
    const bool is_uid = line.starts_with("Uid:");
    if (!is_uid && !line.starts_with("Gid:")) continue;
    std::istringstream values(line.substr(4));
    std::uint64_t real, effective, saved, filesystem;
    std::string trailing;
    const auto expected = static_cast<std::uint64_t>(is_uid ? result.effective_uid : result.effective_gid);
    if (!(values >> real >> effective >> saved >> filesystem) || (values >> trailing) ||
        real != expected || effective != expected || saved != expected || filesystem != expected)
      throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", ENOTSUP);
    if (is_uid) { if (uid_checked) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT"); uid_checked = true; }
    else { if (gid_checked) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT"); gid_checked = true; }
  }
  if (!uid_checked || !gid_checked) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", ENOTSUP);
#endif
  return result;
}
}
bool PosixRightsContext::MatchesCurrent() const {
  const auto current = Frame();
  return current.uid == frame_.uid && current.effective_uid == frame_.effective_uid &&
      current.gid == frame_.gid && current.effective_gid == frame_.effective_gid && current.groups == frame_.groups;
}
std::shared_ptr<RightsContext> CaptureRightsContext() {
  auto result = std::make_shared<PosixRightsContext>(Frame());
  if (!result->MatchesCurrent()) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", EAGAIN);
  return result;
}
std::uint32_t PosixRisks(unsigned permissions) {
  std::uint32_t result = 0;
  if (permissions & 4) result |= ReadContent;
  if (permissions & 2) result |= ChangeNamespace | DeleteChild;
  if (permissions & 1) result |= Traverse;
  return result;
}
int RequiredPosixAccess(DirectoryRole role) {
  return role == DirectoryRole::Ancestor ? X_OK : role == DirectoryRole::PrivateControl ? R_OK | W_OK | X_OK : W_OK | X_OK;
}
RightsCheck PosixAccessResult(int result, int error) {
  if (result == 0) return {RightsState::Satisfied, "kernel-service-access", 0};
  if (error == EACCES || error == EPERM || error == EROFS)
    return {RightsState::Violated, "kernel-service-denied", static_cast<std::uint32_t>(error)};
  return {error == ENOSYS || error == ENOTSUP ? RightsState::Unsupported : RightsState::Unavailable,
      "kernel-access-query-failed", static_cast<std::uint32_t>(error)};
}
RightsFacts ReadPosixDirectoryBase(const NativeObject& object, const PosixRightsContext& context) {
  RightsFacts result;
  result.posix = true;
  if (!context.MatchesCurrent()) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", EAGAIN);
  struct stat info {};
  if (::fstat(static_cast<int>(object.handle()), &info) != 0) {
    const auto code = static_cast<std::uint32_t>(errno);
    result.grants = result.inheritance = result.acl_metadata = {RightsState::Unavailable, "descriptor-query-failed", code};
    return result;
  }
  if (!S_ISDIR(info.st_mode)) throw NativeError("ERR_STORAGE_NATIVE_OBJECT_TYPE");
  result.owner = info.st_uid == context.user() ? OwnerClass::Service :
      info.st_uid == 0 ? OwnerClass::OsAdministratorCandidate : OwnerClass::Other;
  result.sticky = (info.st_mode & S_ISVTX) != 0;
  result.current_risks = PosixRisks(static_cast<unsigned>(((info.st_mode >> 3) & 7) | (info.st_mode & 7)));
  result.grants = {RightsState::Satisfied, "qualified-posix-mode-class-model", 0};
  return result;
}
}  // namespace dss::storage::probe
