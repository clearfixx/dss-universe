/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/src/native-object.h
 *
 * 🎯 Purpose:
 * Owns OS-resource lifetime and the private native metadata vocabulary.
 *
 * 🧠 Responsibilities:
 * • Prevents copying and transfers handle ownership explicitly.
 * • Defines Node-independent technical operations for the prototype.
 *
 * 🏗️ Architecture:
 * Private cross-platform infrastructure contract; no application or Node dependencies.
 *
 * ⚠️ Important:
 * P1 does not establish complete physical root admission.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>
#if !defined(_WIN32) && !defined(__linux__) && !defined(__APPLE__)
#error "Storage native P1 supports only Windows, Linux and macOS"
#endif

namespace dss::storage::probe {
enum class Kind { Root, File };
struct NativeError : std::runtime_error {
  const char* code;
  std::uint32_t os_code;
  NativeError(const char* code_value, std::uint32_t os_value = 0)
      : std::runtime_error("Storage native probe operation failed."),
        code(code_value), os_code(os_value) {}
};
struct Metadata { Kind kind; std::uint64_t size; std::uint32_t links; };
class NativeObject {
 public:
  NativeObject(std::intptr_t handle, Kind kind) noexcept : handle_(handle), kind_(kind) {}
  NativeObject(const NativeObject&) = delete;
  NativeObject& operator=(const NativeObject&) = delete;
  NativeObject(NativeObject&& other) noexcept
      : handle_(other.handle_), kind_(other.kind_) { other.handle_ = -1; }
  ~NativeObject();
  std::intptr_t handle() const noexcept { return handle_; }
  Kind kind() const noexcept { return kind_; }
 private:
  std::intptr_t handle_;
  Kind kind_;
};
void ValidateComponent(const std::string& name);
std::shared_ptr<NativeObject> OpenRoot(const std::string& path);
std::shared_ptr<NativeObject> OpenFile(const NativeObject& root, const std::string& name);
Metadata Inspect(const NativeObject& object);
}  // namespace dss::storage::probe
