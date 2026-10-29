/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/src/platform-win.cc
 *
 * 🎯 Purpose:
 * Binds Windows root-relative objects and owns native handle cleanup.
 *
 * 🧠 Responsibilities:
 * • Validates string conversion and opens relative leaves without following reparse points.
 * • Inspects object type/link metadata and closes handles on failure.
 *
 * 🏗️ Architecture:
 * Private Windows adapter; no Node, Media or application dependencies.
 *
 * ⚠️ Important:
 * Sharing barriers do not replace future effective ACL admission.
 *
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
#include <winternl.h>
#include <limits>
#include <climits>

namespace dss::storage::probe {
namespace {
HANDLE Handle(const NativeObject& object) { return reinterpret_cast<HANDLE>(object.handle()); }
std::wstring Wide(const std::string& text) {
  if (text.size() > static_cast<std::size_t>(INT_MAX) || text.find('\0') != std::string::npos)
    throw NativeError("ERR_STORAGE_NATIVE_STRING");
  int length = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text.data(),
                                  static_cast<int>(text.size()), nullptr, 0);
  if (length == 0) throw NativeError("ERR_STORAGE_NATIVE_STRING");
  std::wstring result(static_cast<std::size_t>(length), L'\0');
  if (MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text.data(),
      static_cast<int>(text.size()), result.data(), length) != length)
    throw NativeError("ERR_STORAGE_NATIVE_STRING");
  return result;
}
}
NativeObject::~NativeObject() { if (handle() != -1) CloseHandle(Handle(*this)); }

Metadata Inspect(const NativeObject& object) {
  FILE_ATTRIBUTE_TAG_INFO tags {};
  FILE_STANDARD_INFO info {};
  if (!GetFileInformationByHandleEx(Handle(object), FileAttributeTagInfo, &tags, sizeof(tags)) ||
      !GetFileInformationByHandleEx(Handle(object), FileStandardInfo, &info, sizeof(info)))
    throw NativeError("ERR_STORAGE_NATIVE_IO", GetLastError());
  if ((tags.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0)
    throw NativeError("ERR_STORAGE_NATIVE_LINK");
  if ((object.kind() == Kind::Root) != static_cast<bool>(info.Directory))
    throw NativeError("ERR_STORAGE_NATIVE_OBJECT_TYPE");
  if (object.kind() == Kind::File && info.NumberOfLinks != 1)
    throw NativeError("ERR_STORAGE_NATIVE_LINK");
  if (info.EndOfFile.QuadPart < 0) throw NativeError("ERR_STORAGE_NATIVE_METADATA");
  return {object.kind(), static_cast<std::uint64_t>(info.EndOfFile.QuadPart), info.NumberOfLinks};
}

std::shared_ptr<NativeObject> OpenRoot(const std::string& path) {
  const auto wide = Wide(path);
  if (wide.size() < 3 || !((wide[0] >= L'A' && wide[0] <= L'Z') ||
      (wide[0] >= L'a' && wide[0] <= L'z')) || wide[1] != L':' ||
      (wide[2] != L'\\' && wide[2] != L'/')) throw NativeError("ERR_STORAGE_NATIVE_ROOT_PATH");
  HANDLE handle = CreateFileW(wide.c_str(), FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES | SYNCHRONIZE,
      FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING,
      FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT, nullptr);
  if (handle == INVALID_HANDLE_VALUE) throw NativeError("ERR_STORAGE_NATIVE_IO", GetLastError());
  NativeObject resource(reinterpret_cast<std::intptr_t>(handle), Kind::Root);
  Inspect(resource);
  return std::make_shared<NativeObject>(std::move(resource));
}

std::shared_ptr<NativeObject> OpenFile(const NativeObject& root, const std::string& name) {
  ValidateComponent(name);
  if (root.kind() != Kind::Root) throw NativeError("ERR_STORAGE_NATIVE_CAPABILITY_KIND");
  auto wide = Wide(name);
  if (wide.size() > (std::numeric_limits<USHORT>::max() / sizeof(wchar_t)) - 1)
    throw NativeError("ERR_STORAGE_NATIVE_COMPONENT");
  UNICODE_STRING text {};
  text.Length = static_cast<USHORT>(wide.size() * sizeof(wchar_t));
  text.MaximumLength = static_cast<USHORT>(text.Length + sizeof(wchar_t));
  text.Buffer = wide.data();
  OBJECT_ATTRIBUTES attributes {};
  attributes.Length = sizeof(attributes);
  attributes.RootDirectory = Handle(root);
  attributes.ObjectName = &text;
  attributes.Attributes = 0x40;  // OBJ_CASE_INSENSITIVE.
  IO_STATUS_BLOCK io {};
  HANDLE handle = INVALID_HANDLE_VALUE;
  const NTSTATUS status = NtCreateFile(&handle, FILE_READ_DATA | FILE_READ_ATTRIBUTES | SYNCHRONIZE,
      &attributes, &io, nullptr, 0, FILE_SHARE_READ, 1,
      0x00200000 | 0x00000020 | 0x00000040, nullptr, 0);
  if (status < 0) throw NativeError("ERR_STORAGE_NATIVE_IO", static_cast<std::uint32_t>(status));
  NativeObject resource(reinterpret_cast<std::intptr_t>(handle), Kind::File);
  Inspect(resource);
  return std::make_shared<NativeObject>(std::move(resource));
}
}  // namespace dss::storage::probe
