/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-evidence.cc
 * 🎯 Purpose: Collects fresh directory facts under the entry execution context.
 * 🧠 Responsibilities: Pins chain resources, checks context stability and joins actual parent facts.
 * 🏗️ Architecture: Native orchestration only; OS readers and pure role model remain separate.
 * ⚠️ Important: Fresh checks are non-atomic; no mount qualification or admitted root is returned.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include "rights-model.h"

namespace dss::storage::probe {
std::vector<RoleRightsEvidence> InspectRoleRights(const NativeChain& chain, DirectoryRole role,
    const RightsContext& context) {
  if (!chain.security_read()) throw NativeError("ERR_STORAGE_NATIVE_SECURITY_CAPABILITY");
  if (chain.components().empty() || chain.components().size() > 1024)
    throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_LIMIT");
  if (!context.MatchesCurrent()) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT");
  InspectChain(chain);
  std::vector<RightsFacts> facts;
  facts.reserve(chain.components().size());
  for (std::size_t index = 0; index < chain.components().size(); ++index) {
    const auto component_role = index + 1 == chain.components().size() ? role : DirectoryRole::Ancestor;
    facts.push_back(ReadDirectoryRights(*chain.components()[index], component_role, context));
  }
  if (!context.MatchesCurrent()) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT");
  std::vector<RoleRightsEvidence> result;
  result.reserve(facts.size());
  for (std::size_t index = 0; index < facts.size(); ++index) {
    result.push_back(EvaluateDirectoryRights(facts[index], index + 1 == facts.size() ? role : DirectoryRole::Ancestor,
        index ? &facts[index - 1] : nullptr, index + 1 < facts.size() ? &facts[index + 1] : nullptr));
  }
  return result;
}
}  // namespace dss::storage::probe
