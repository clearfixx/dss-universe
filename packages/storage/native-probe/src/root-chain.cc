/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native R1
 * 📄 File: packages/storage/native-probe/src/root-chain.cc
 *
 * 🎯 Purpose:
 * Plans complete absolute component traversal before native IO and reinspects
 * captured directories without reconstructing mutable paths.
 *
 * 🧠 Responsibilities:
 * • rejects ambiguous, relative and traversal-bearing root plans;
 * • preserves platform component spelling and bounds structural facts;
 * • keeps capture distinct from future security admission.
 *
 * 🏗️ Architecture:
 * Node-independent native infrastructure; no API, Worker or Media dependencies.
 *
 * ⚠️ Important:
 * No effective-ACL, mount, publication or production-containment guarantee.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <limits>

namespace dss::storage::probe {
RootChainPlan PlanRootChain(const std::string& path) {
  if (path.empty() || path.find('\0') != std::string::npos)
    throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
  RootChainPlan plan;
  std::size_t begin;
#if defined(_WIN32)
  if (path.size() < 3 || !((path[0] >= 'A' && path[0] <= 'Z') ||
      (path[0] >= 'a' && path[0] <= 'z')) || path[1] != ':' ||
      (path[2] != '\\' && path[2] != '/')) throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
  plan.anchor = path.substr(0, 2) + "\\";
  begin = 3;
  const auto separator = [](char value) { return value == '/' || value == '\\'; };
#else
  if (path[0] != '/' || (path.size() > 1 && path[1] == '/'))
    throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
  plan.anchor = "/";
  begin = 1;
  const auto separator = [](char value) { return value == '/'; };
#endif
  for (std::size_t index = begin; index <= path.size(); ++index) {
    if (index != path.size() && !separator(path[index])) continue;
    if (index == begin) {
      // Anchor-only and one trailing separator are unambiguous.
      if (index == path.size()) break;
      throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
    }
    auto component = path.substr(begin, index - begin);
    if (component == "." || component == "..") throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
#if defined(_WIN32)
    if (component.find(':') != std::string::npos) throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
#endif
    plan.components.push_back(std::move(component));
    begin = index + 1;
  }
  if (plan.components.size() >= std::numeric_limits<std::uint32_t>::max())
    throw NativeError("ERR_STORAGE_NATIVE_ROOT_PLAN");
  return plan;
}

std::uint32_t InspectChain(const NativeChain& chain) {
  if (chain.components().empty() || chain.components().size() > std::numeric_limits<std::uint32_t>::max())
    throw NativeError("ERR_STORAGE_NATIVE_METADATA");
  for (const auto& component : chain.components()) {
    if (component->kind() != Kind::Root) throw NativeError("ERR_STORAGE_NATIVE_CAPABILITY_KIND");
    Inspect(*component);
  }
  return static_cast<std::uint32_t>(chain.components().size());
}
}  // namespace dss::storage::probe
