/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/src/platform-posix.cc
 *
 * 🎯 Purpose:
 * Binds POSIX descriptors through no-follow opens and owned resource lifetime.
 *
 * 🧠 Responsibilities:
 * • Opens typed directory/file objects and inspects actual metadata.
 * • Rejects nonregular or multiply linked file objects and closes rejected handles.
 *
 * 🏗️ Architecture:
 * Private Linux/macOS syscall adapter, independent of Node and Media.
 *
 * ⚠️ Important:
 * Whole ancestor admission and mount policy remain outside P1.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <cerrno>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

namespace dss::storage::probe {
NativeObject::~NativeObject() { if (handle() != -1) ::close(static_cast<int>(handle())); }

Metadata Inspect(const NativeObject& object) {
  struct stat info {};
  if (::fstat(static_cast<int>(object.handle()), &info) != 0)
    throw NativeError("ERR_STORAGE_NATIVE_IO", static_cast<std::uint32_t>(errno));
  if ((object.kind() == Kind::Root && !S_ISDIR(info.st_mode)) ||
      (object.kind() == Kind::File && !S_ISREG(info.st_mode)))
    throw NativeError("ERR_STORAGE_NATIVE_OBJECT_TYPE");
  if (object.kind() == Kind::File && info.st_nlink != 1)
    throw NativeError("ERR_STORAGE_NATIVE_LINK");
  if (info.st_size < 0 || !std::in_range<std::uint32_t>(info.st_nlink))
    throw NativeError("ERR_STORAGE_NATIVE_METADATA");
  return {object.kind(), static_cast<std::uint64_t>(info.st_size),
          static_cast<std::uint32_t>(info.st_nlink)};
}

std::shared_ptr<NativeObject> OpenRoot(const std::string& path) {
  if (path.empty() || path.front() != '/' || path.find('\0') != std::string::npos)
    throw NativeError("ERR_STORAGE_NATIVE_ROOT_PATH");
  int fd = ::open(path.c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
  if (fd == -1) throw NativeError("ERR_STORAGE_NATIVE_IO", static_cast<std::uint32_t>(errno));
  NativeObject resource(fd, Kind::Root);
  Inspect(resource);
  return std::make_shared<NativeObject>(std::move(resource));
}

std::shared_ptr<NativeObject> OpenFile(const NativeObject& root, const std::string& name) {
  ValidateComponent(name);
  if (root.kind() != Kind::Root) throw NativeError("ERR_STORAGE_NATIVE_CAPABILITY_KIND");
  int fd = ::openat(static_cast<int>(root.handle()), name.c_str(),
                    O_RDONLY | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK);
  if (fd == -1) throw NativeError("ERR_STORAGE_NATIVE_IO", static_cast<std::uint32_t>(errno));
  NativeObject resource(fd, Kind::File);
  Inspect(resource);
  return std::make_shared<NativeObject>(std::move(resource));
}
}  // namespace dss::storage::probe
