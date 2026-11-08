/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Topology Evidence
 * 📄 File: packages/storage/native-probe/src/topology-darwin.cc
 * 🎯 Purpose: Observes Darwin device/inode, filesystem ID and volume flags.
 * 🧠 Responsibilities: Preserves native identity privately without calling fsid a unique mount ID.
 * 🏗️ Architecture: Descriptor-only OS adapter using existing system headers.
 * ⚠️ Important: MNT_LOCAL and filesystem names are observations, never qualification.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <cerrno>
#include <cstring>
#include <sys/param.h>
#include <sys/mount.h>
#include <sys/stat.h>

namespace dss::storage::probe {
TopologyEvidence ReadTopology(const NativeObject& object) {
  TopologyEvidence result;
  const int fd = static_cast<int>(object.handle());
  result.object.kind = "darwin-device-inode";
  result.filesystem.kind = "darwin-device-fsid";
  result.device.kind = "darwin-device";
  result.mount.state = TopologyState::Unsupported;
  result.mount.os_code = ENOTSUP;
  struct stat identity {};
  if (::fstat(fd, &identity) == 0) {
    result.object.state = TopologyState::Present;
    AppendIdentity(result.object.bytes, static_cast<std::uint64_t>(identity.st_dev));
    AppendIdentity(result.object.bytes, static_cast<std::uint64_t>(identity.st_ino));
    result.device.state = TopologyState::Present;
    AppendIdentity(result.device.bytes, static_cast<std::uint64_t>(identity.st_dev));
  } else {
    result.object.os_code = static_cast<std::uint32_t>(errno);
    result.device.os_code = result.object.os_code;
  }
  struct statfs filesystem {};
  if (::fstatfs(fd, &filesystem) == 0) {
    if (result.object.state == TopologyState::Present) {
      result.filesystem.state = TopologyState::Present;
      AppendIdentity(result.filesystem.bytes, static_cast<std::uint64_t>(identity.st_dev));
      AppendIdentity(result.filesystem.bytes, static_cast<std::uint32_t>(filesystem.f_fsid.val[0]));
      AppendIdentity(result.filesystem.bytes, static_cast<std::uint32_t>(filesystem.f_fsid.val[1]));
    } else result.filesystem.os_code = result.object.os_code;
    result.flags_known = true;
    result.read_only = (filesystem.f_flags & MNT_RDONLY) != 0;
    result.local_known = true;
    result.local = (filesystem.f_flags & MNT_LOCAL) != 0;
    result.filesystem_family = std::strcmp(filesystem.f_fstypename, "apfs") == 0 ? "apfs" :
        std::strcmp(filesystem.f_fstypename, "hfs") == 0 ? "hfs" : "other";
  } else {
    const auto error = static_cast<std::uint32_t>(errno);
    result.filesystem.os_code = error;
    result.flags_os_code = error;
  }
  return result;
}
}  // namespace dss::storage::probe
