/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-model.h
 * 🎯 Purpose: Defines private directory-right observations and fixed model contracts.
 * 🧠 Responsibilities: Separates identity, kernel access, grant bounds and parent/inheritance states.
 * 🏗️ Architecture: Node-independent native types; platform identities never enter its projection.
 * ⚠️ Important: Model satisfaction requires qualification; it is never root admission.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include <cstdint>
#include <memory>
#include <vector>

namespace dss::storage::probe {
enum class DirectoryRole { Ancestor, SharedNamespace, ProtectedParent, PrivateControl };
enum class RightsState { Satisfied, Violated, Unavailable, Unsupported };
enum class OwnerClass { Service, OsAdministratorCandidate, Other, Unknown };
enum RightsRisk : std::uint32_t {
  ReadContent = 1, ChangeNamespace = 2, ChangeMetadata = 4,
  DeleteObject = 8, DeleteChild = 16, Traverse = 32
};
struct RightsCheck {
  RightsState state = RightsState::Unavailable;
  const char* reason = "metadata-unavailable";
  std::uint32_t os_code = 0;
};
struct RightsFacts {
  OwnerClass owner = OwnerClass::Unknown;
  RightsCheck service_access;
  RightsCheck acl_metadata;
  RightsCheck grants;
  RightsCheck inheritance;
  std::uint32_t current_risks = 0;
  std::uint32_t inherited_risks = 0;
  bool posix = false;
  bool sticky = false;
};
struct RoleRightsEvidence {
  DirectoryRole role = DirectoryRole::Ancestor;
  OwnerClass owner_class = OwnerClass::Unknown;
  RightsCheck owner, service_access, acl_metadata, grant_model, inheritance_model, parent_model;
};
enum class RightsContextKind { Windows, Posix };
class RightsContext {
 public:
  virtual ~RightsContext() = default;
  virtual bool MatchesCurrent() const = 0;
  virtual RightsContextKind kind() const = 0;
};
class NativeObject;
class NativeChain;
DirectoryRole ParseDirectoryRole(const char* text);
const char* DirectoryRoleName(DirectoryRole role);
const char* RightsStateName(RightsState state);
const char* OwnerClassName(OwnerClass owner);
RoleRightsEvidence EvaluateDirectoryRights(const RightsFacts& facts, DirectoryRole role,
    const RightsFacts* parent, const RightsFacts* child);
std::shared_ptr<RightsContext> CaptureRightsContext();
RightsFacts ReadDirectoryRights(const NativeObject& object, DirectoryRole role, const RightsContext& context);
std::vector<RoleRightsEvidence> InspectRoleRights(const NativeChain& chain, DirectoryRole role,
    const RightsContext& context);
}  // namespace dss::storage::probe
