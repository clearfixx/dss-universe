/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Topology Evidence
 * 📄 File: packages/storage/native-probe/src/topology-win.cc
 * 🎯 Purpose: Reads Windows file IDs and volume properties from retained handles.
 * 🧠 Responsibilities: Keeps raw IDs private and mount-point identity explicitly unsupported.
 * 🏗️ Architecture: Existing Windows SDK only; no pathname reconstruction.
 * ⚠️ Important: A volume serial is not a mount ID, security policy or relocation lock.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <cwchar>

namespace dss::storage::probe {
TopologyEvidence ReadTopology(const NativeObject& object) {
  TopologyEvidence result;
  const auto handle = reinterpret_cast<HANDLE>(object.handle());
  result.object.kind = "windows-file-id-128";
  result.filesystem.kind = "windows-volume-serial";
  result.device.kind = "windows-volume-serial";
  result.mount.state = TopologyState::Unsupported;
  result.mount.os_code = ERROR_NOT_SUPPORTED;
  FILE_ID_INFO identity {};
  if (GetFileInformationByHandleEx(handle, FileIdInfo, &identity, sizeof(identity))) {
    result.object.state = TopologyState::Present;
    result.filesystem.state = TopologyState::Present;
    AppendIdentity(result.filesystem.bytes, identity.VolumeSerialNumber);
    result.device = result.filesystem;
    result.object.bytes = result.filesystem.bytes;
    result.object.bytes.insert(result.object.bytes.end(), identity.FileId.Identifier, identity.FileId.Identifier + 16);
  } else {
    result.object.os_code = GetLastError();
    result.filesystem.os_code = result.object.os_code;
    result.device.os_code = result.object.os_code;
  }
  DWORD flags = 0;
  wchar_t family[64] {};
  if (GetVolumeInformationByHandleW(handle, nullptr, 0, nullptr, nullptr, &flags, family, 64)) {
    result.flags_known = true;
    result.read_only = (flags & FILE_READ_ONLY_VOLUME) != 0;
    result.persistent_acl_known = true;
    result.persistent_acl = (flags & FILE_PERSISTENT_ACLS) != 0;
    result.filesystem_family = std::wcscmp(family, L"NTFS") == 0 ? "ntfs" :
        std::wcscmp(family, L"ReFS") == 0 ? "refs" : "other";
  } else result.flags_os_code = GetLastError();
  // Volume flags do not establish local/remote status or mount-point identity.
  return result;
}
}  // namespace dss::storage::probe
