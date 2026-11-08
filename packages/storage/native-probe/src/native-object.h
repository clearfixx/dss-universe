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
 * • Retains whole captured directory chains without claiming security admission.
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
#include <vector>
#include "security-evidence.h"
#include "topology-evidence.h"
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
struct RootChainPlan { std::string anchor; std::vector<std::string> components; };
RootChainPlan PlanRootChain(const std::string& path);
class NativeChain {
 public:
  explicit NativeChain(std::vector<std::shared_ptr<NativeObject>> components, bool security_read = false)
      : components_(std::move(components)), security_read_(security_read) {}
  NativeChain(const NativeChain&) = delete;
  NativeChain& operator=(const NativeChain&) = delete;
  const std::vector<std::shared_ptr<NativeObject>>& components() const noexcept { return components_; }
  bool security_read() const noexcept { return security_read_; }
 private:
  std::vector<std::shared_ptr<NativeObject>> components_;
  bool security_read_;
};
std::shared_ptr<NativeChain> CaptureRootChain(const std::string& path);
std::uint32_t InspectChain(const NativeChain& chain);
std::shared_ptr<NativeChain> CaptureSecurityChain(const std::string& path);
SecurityEvidence ReadSecurity(const NativeObject& object);
#if !defined(_WIN32)
SecurityEvidence ReadPosixSecurityBase(const NativeObject& object);
#endif
std::vector<SecurityEvidence> InspectSecurityChain(const NativeChain& chain);
TopologyEvidence ReadTopology(const NativeObject& object);
std::vector<TopologyEvidence> InspectTopologyChain(const NativeChain& chain);
}  // namespace dss::storage::probe
