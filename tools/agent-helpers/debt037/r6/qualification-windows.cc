/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/qualification-windows.cc
 * 🎯 Purpose: Measures Windows device characteristics from an actual retained handle.
 * 🧠 Responsibilities: Validates documented ABI/returned lengths and ordinary token state.
 * 🏗️ Architecture: Test-only adapter using installed SDK and loaded system ntdll.
 * ⚠️ Important: Driver device flags are observations, never mount/containment certificates.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "qualification-proof.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <winternl.h>
#include <cstring>
#include <stdexcept>
namespace dss::storage::qualification_proof {
namespace {
// Documented FILE_FS_DEVICE_INFORMATION ABI; public Microsoft Terminal source
// cbc857bdf7749981890c5b561ee44ea31948bfb1/src/host/conddkrefs.h supplies the
// user-mode FS_INFORMATION_CLASS ordinal4. No driver header/package is installed.
enum class VolumeClass : int { Device = 4 };
struct DeviceInformation { DWORD type; ULONG characteristics; };
static_assert(sizeof(VolumeClass) == 4 && sizeof(DeviceInformation) == 8 &&
    offsetof(DeviceInformation, characteristics) == 4);
using QueryVolume = NTSTATUS (NTAPI *)(HANDLE, PIO_STATUS_BLOCK, PVOID, ULONG, VolumeClass);
Fact DeviceFlag(const DeviceInformation& info, std::size_t returned, ULONG bit) {
  if (returned != sizeof(info)) return Unavailable(ERROR_BAD_LENGTH);
  return Present((info.characteristics & bit) != 0);
}
}
Evidence ObservePlatform(const NativeObject& object) {
  Evidence result;
  const auto handle = reinterpret_cast<HANDLE>(object.handle());
  DWORD flags = 0;
  if (GetVolumeInformationByHandleW(handle, nullptr, 0, nullptr, nullptr, &flags, nullptr, 0))
    result.read_only = Present((flags & FILE_READ_ONLY_VOLUME) != 0);
  else result.read_only = Unavailable(GetLastError());
  const auto address = GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "NtQueryVolumeInformationFile");
  if (!address) {
    result.remote_device = result.removable_media = Unsupported(ERROR_PROC_NOT_FOUND); return result;
  }
  QueryVolume query = nullptr;
  static_assert(sizeof(query) == sizeof(address));
  std::memcpy(&query, &address, sizeof(query));
  DeviceInformation device {};
  IO_STATUS_BLOCK io {};
  const NTSTATUS status = query(handle, &io, &device, sizeof(device), VolumeClass::Device);
  if (status != 0 || io.Status != 0) {
    result.remote_device = result.removable_media = Unavailable(static_cast<std::uint32_t>(status != 0 ? status : io.Status));
    return result;
  }
  // FILE_REMOTE_DEVICE and FILE_REMOVABLE_MEDIA: documented device characteristics.
  result.remote_device = DeviceFlag(device, io.Information, 0x10);
  result.removable_media = DeviceFlag(device, io.Information, 0x01);
  return result;
}
bool DecoderControls() {
  const DeviceInformation remote {7, 0x10}, local {7, 0};
  if (DeviceFlag(remote, 8, 0x10).value != 1 || DeviceFlag(local, 8, 0x10).value != 0 ||
      DeviceFlag(remote, 7, 0x10).state != State::Unavailable ||
      DeviceFlag(remote, 9, 0x10).state != State::Unavailable)
    throw std::runtime_error("device decoder control");
  return true;
}
bool OrdinaryContext() {
  HANDLE token = nullptr;
  if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) return false;
  struct Close { HANDLE value; ~Close() { CloseHandle(value); } } owned {token};
  TOKEN_ELEVATION elevation {}; DWORD returned = 0;
  return GetTokenInformation(token, TokenElevation, &elevation, sizeof(elevation), &returned) &&
      returned == sizeof(elevation) && !elevation.TokenIsElevated;
}
}  // namespace dss::storage::qualification_proof
