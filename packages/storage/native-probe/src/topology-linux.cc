/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Topology Evidence
 * 📄 File: packages/storage/native-probe/src/topology-linux.cc
 * 🎯 Purpose: Observes Linux object/filesystem identity and explicit statx mount IDs.
 * 🧠 Responsibilities: Checks returned masks and distinguishes unique from legacy mount IDs.
 * 🏗️ Architecture: Descriptor-only OS adapter with no new library dependency.
 * ⚠️ Important: Device equality is not mount equality; unknown flags never become zero IDs.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <cerrno>
#include <fcntl.h>
#include <linux/stat.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <sys/syscall.h>
#include <sys/vfs.h>
#include <unistd.h>

namespace dss::storage::probe {
namespace {
void ObserveMount(int fd, IdentityObservation& mount) {
#if defined(SYS_statx) && defined(STATX_MNT_ID)
  struct statx info {};
#if defined(STATX_MNT_ID_UNIQUE)
  if (::syscall(SYS_statx, fd, "", AT_EMPTY_PATH | AT_SYMLINK_NOFOLLOW, STATX_MNT_ID_UNIQUE, &info) == 0 &&
      (info.stx_mask & STATX_MNT_ID_UNIQUE) != 0) {
    mount.state = TopologyState::Present;
    mount.kind = "linux-unique-mount-id";
    AppendIdentity(mount.bytes, info.stx_mnt_id);
    return;
  }
#endif
  info = {};
  if (::syscall(SYS_statx, fd, "", AT_EMPTY_PATH | AT_SYMLINK_NOFOLLOW, STATX_MNT_ID, &info) == 0) {
    if ((info.stx_mask & STATX_MNT_ID) != 0) {
      mount.state = TopologyState::Present;
      mount.kind = "linux-legacy-mount-id";
      AppendIdentity(mount.bytes, info.stx_mnt_id);
    } else { mount.state = TopologyState::Unsupported; mount.os_code = EOPNOTSUPP; }
  } else {
    const int error = errno;
    mount.os_code = static_cast<std::uint32_t>(error);
    mount.state = error == ENOSYS || error == EOPNOTSUPP ? TopologyState::Unsupported : TopologyState::Unavailable;
  }
#else
  (void)fd;
  mount.state = TopologyState::Unsupported;
  mount.os_code = ENOSYS;
#endif
}
}
TopologyEvidence ReadTopology(const NativeObject& object) {
  TopologyEvidence result;
  const int fd = static_cast<int>(object.handle());
  result.object.kind = "linux-device-inode";
  result.filesystem.kind = "linux-device-fsid";
  struct stat identity {};
  if (::fstat(fd, &identity) == 0) {
    result.object.state = TopologyState::Present;
    AppendIdentity(result.object.bytes, static_cast<std::uint64_t>(identity.st_dev));
    AppendIdentity(result.object.bytes, static_cast<std::uint64_t>(identity.st_ino));
  } else result.object.os_code = static_cast<std::uint32_t>(errno);
  struct statfs filesystem {};
  if (::fstatfs(fd, &filesystem) == 0) {
    if (result.object.state == TopologyState::Present) {
      result.filesystem.state = TopologyState::Present;
      AppendIdentity(result.filesystem.bytes, static_cast<std::uint64_t>(identity.st_dev));
      AppendIdentity(result.filesystem.bytes, static_cast<std::uint32_t>(filesystem.f_fsid.__val[0]));
      AppendIdentity(result.filesystem.bytes, static_cast<std::uint32_t>(filesystem.f_fsid.__val[1]));
    } else result.filesystem.os_code = result.object.os_code;
    switch (static_cast<unsigned long>(filesystem.f_type)) {
      case 0xef53: result.filesystem_family = "ext"; break;
      case 0x58465342: result.filesystem_family = "xfs"; break;
      case 0x9123683e: result.filesystem_family = "btrfs"; break;
      case 0x01021994: result.filesystem_family = "tmpfs"; break;
      case 0x794c7630: result.filesystem_family = "overlay"; break;
      default: result.filesystem_family = "other";
    }
  } else result.filesystem.os_code = static_cast<std::uint32_t>(errno);
  struct statvfs flags {};
  if (::fstatvfs(fd, &flags) == 0) { result.flags_known = true; result.read_only = (flags.f_flag & ST_RDONLY) != 0; }
  else result.flags_os_code = static_cast<std::uint32_t>(errno);
  ObserveMount(fd, result.mount);
  return result;
}
}  // namespace dss::storage::probe
