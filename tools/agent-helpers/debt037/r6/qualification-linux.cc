/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/qualification-linux.cc
 * 🎯 Purpose: Binds Linux mount attributes to held-object unique mount identities.
 * 🧠 Responsibilities: Checks SDK feature gates, returned sizes/masks and genuine syscall errors.
 * 🏗️ Architecture: Test-only descriptor route; no mountinfo/pathname or legacy-ID fallback.
 * ⚠️ Important: A non-idmapped mount does not qualify the caller or filesystem identity domain.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "qualification-proof.h"
#include "qualification-linux-abi.h"
#include <cerrno>
#include <cstddef>
#include <fcntl.h>
#include <linux/mount.h>
#include <linux/magic.h>
#include <linux/stat.h>
#include <asm/unistd.h>
#include <sys/stat.h>
#include <sys/vfs.h>
#include <sys/statvfs.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <stdexcept>
namespace dss::storage::qualification_proof {
namespace {
struct NamespaceStamp {
  int user = -1, mount = -1;
  struct stat user_info {}, mount_info {};
  std::uint32_t error = 0;
  NamespaceStamp() {
    user = ::open("/proc/thread-self/ns/user", O_RDONLY | O_CLOEXEC);
    mount = ::open("/proc/thread-self/ns/mnt", O_RDONLY | O_CLOEXEC);
    if (user < 0 || mount < 0) { error = static_cast<std::uint32_t>(errno); return; }
    struct statfs user_fs {}, mount_fs {};
    if (::fstat(user, &user_info) || ::fstat(mount, &mount_info) ||
        ::fstatfs(user, &user_fs) || ::fstatfs(mount, &mount_fs)) error = static_cast<std::uint32_t>(errno);
    else if (static_cast<unsigned long>(user_fs.f_type) != NSFS_MAGIC ||
        static_cast<unsigned long>(mount_fs.f_type) != NSFS_MAGIC) error = EPROTO;
  }
  NamespaceStamp(const NamespaceStamp&) = delete;
  NamespaceStamp& operator=(const NamespaceStamp&) = delete;
  ~NamespaceStamp() { if (user >= 0) ::close(user); if (mount >= 0) ::close(mount); }
};
Fact CompareNamespaces(const NamespaceStamp& before, const NamespaceStamp& after) {
  if (before.error || after.error) return Unavailable(before.error ? before.error : after.error);
  return Present(before.user_info.st_dev == after.user_info.st_dev && before.user_info.st_ino == after.user_info.st_ino &&
      before.mount_info.st_dev == after.mount_info.st_dev && before.mount_info.st_ino == after.mount_info.st_ino);
}
#if (defined(SYS_statmount) || defined(__NR_statmount)) && defined(SYS_statx) && defined(STATX_MNT_ID_UNIQUE) && defined(MOUNT_ATTR_IDMAP)
#define DSS_R6_HAS_MOUNT_QUERY 1
#if defined(SYS_statmount)
constexpr long MountSyscall = SYS_statmount;
#else
constexpr long MountSyscall = __NR_statmount;
#endif
Fact Decode(const MountBasicPrefix& value, std::size_t capacity, std::uint64_t expected, bool idmap) {
  if (value.size > capacity || value.size < sizeof(MountBasicPrefix) ||
      !(value.mask & MountBasicMask) || value.mnt_id != expected) return Unavailable(EPROTO);
  return Present(idmap ? (value.mnt_attr & MOUNT_ATTR_IDMAP) != 0 : true);
}
bool UniqueMount(int fd, struct statx& value) {
  errno = 0;
  if (::syscall(SYS_statx, fd, "", AT_EMPTY_PATH | AT_SYMLINK_NOFOLLOW, STATX_MNT_ID_UNIQUE, &value) != 0) return false;
  if ((value.stx_mask & STATX_MNT_ID_UNIQUE) == 0) { errno = EOPNOTSUPP; return false; }
  return true;
}
#endif
}
Evidence ObservePlatform(const NativeObject& object) {
  Evidence result;
  // Installed build facts:1 syscall ordinal,2 unique statx ID,4 native basic layout,8 reviewed wire prefix.
  result.linux_build_features = 8;
#if defined(SYS_statmount) || defined(__NR_statmount)
  result.linux_build_features |= 1;
#endif
#if defined(SYS_statx) && defined(STATX_MNT_ID_UNIQUE)
  result.linux_build_features |= 2;
#endif
#if defined(STATMOUNT_MNT_BASIC)
  result.linux_build_features |= 4;
#endif
  NamespaceStamp entry;
  const int fd = static_cast<int>(object.handle());
  struct statvfs flags {};
  if (::fstatvfs(fd, &flags) == 0) result.read_only = Present((flags.f_flag & ST_RDONLY) != 0);
  else result.read_only = Unavailable(static_cast<std::uint32_t>(errno));
#if defined(DSS_R6_HAS_MOUNT_QUERY)
  struct statx before {}, after {};
  if (!UniqueMount(fd, before)) {
    result.mount_bound = result.idmapped = Unavailable(errno ? static_cast<std::uint32_t>(errno) : EOPNOTSUPP);
    NamespaceStamp exit; result.namespace_context = CompareNamespaces(entry, exit); return result;
  }
  MountRequestV0 request {};
  request.mnt_id = before.stx_mnt_id;
  MountBasicPrefix mount {};
  if (::syscall(MountSyscall, &request, &mount, sizeof(mount), 0) != 0) {
    result.mount_bound = result.idmapped = Unavailable(static_cast<std::uint32_t>(errno));
    NamespaceStamp exit; result.namespace_context = CompareNamespaces(entry, exit); return result;
  }
  if (!UniqueMount(fd, after) || before.stx_mnt_id != after.stx_mnt_id) {
    result.mount_bound = result.idmapped = Unavailable(ESTALE);
    NamespaceStamp exit; result.namespace_context = CompareNamespaces(entry, exit); return result;
  }
  result.mount_bound = Decode(mount, sizeof(mount), before.stx_mnt_id, false);
  result.idmapped = Decode(mount, sizeof(mount), before.stx_mnt_id, true);
#else
  result.mount_bound = result.idmapped = Unsupported(0); // Not attempted: installed syscall/unique-ID declarations missing.
#endif
  NamespaceStamp exit; result.namespace_context = CompareNamespaces(entry, exit);
  return result;
}
bool DecoderControls() {
#if defined(DSS_R6_HAS_MOUNT_QUERY)
  MountBasicPrefix value {};
  value.size = sizeof(value); value.mask = MountBasicMask; value.mnt_id = 42;
  if (Decode(value, sizeof(value), 42, true).value != 0) throw std::runtime_error("mount decoder");
  value.mnt_attr = MOUNT_ATTR_IDMAP;
  if (Decode(value, sizeof(value), 42, true).value != 1) throw std::runtime_error("mount decoder");
  value.mask = 0;
  if (Decode(value, sizeof(value), 42, true).state != State::Unavailable) throw std::runtime_error("mount mask");
  value.mask = MountBasicMask; value.size = 1;
  if (Decode(value, sizeof(value), 42, true).state != State::Unavailable) throw std::runtime_error("mount short");
  value.size = sizeof(value) + 1;
  if (Decode(value, sizeof(value), 42, true).state != State::Unavailable) throw std::runtime_error("mount extent");
  value.size = sizeof(value);
  if (Decode(value, sizeof(value), 43, true).state != State::Unavailable) throw std::runtime_error("mount binding");
  return true;
#else
  return false;
#endif
}
bool OrdinaryContext() {
  if (::getuid() == 0 || ::getgid() == 0 || ::getuid() != ::geteuid() || ::getgid() != ::getegid()) return false;
  errno = 0;
  return ::setuid(0) == -1 && errno == EPERM;
}
}  // namespace dss::storage::qualification_proof
