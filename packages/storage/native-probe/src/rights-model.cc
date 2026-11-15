/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-model.cc
 * 🎯 Purpose: Applies the fixed conservative directory-role model to native facts.
 * 🧠 Responsibilities: Includes owner, parent deletion and inherited grants without deny-credit shortcuts.
 * 🏗️ Architecture: Pure native model; no OS queries, Node objects or caller trust overrides.
 * ⚠️ Important: Sticky exceptions are explicit qualified hypotheses, not relocation guarantees.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include "rights-model.h"
#include <cstring>

namespace dss::storage::probe {
namespace {
RightsCheck Pass(const char* reason) { return {RightsState::Satisfied, reason, 0}; }
RightsCheck Fail(const char* reason) { return {RightsState::Violated, reason, 0}; }
bool TrustedModelOwner(OwnerClass owner) {
  return owner == OwnerClass::Service || owner == OwnerClass::OsAdministratorCandidate;
}
constexpr std::uint32_t mutations = ChangeNamespace | ChangeMetadata | DeleteObject | DeleteChild;
}
DirectoryRole ParseDirectoryRole(const char* text) {
  if (!text) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_ROLE");
  if (std::strcmp(text, "ancestor") == 0) return DirectoryRole::Ancestor;
  if (std::strcmp(text, "shared-namespace") == 0) return DirectoryRole::SharedNamespace;
  if (std::strcmp(text, "protected-parent") == 0) return DirectoryRole::ProtectedParent;
  if (std::strcmp(text, "private-control") == 0) return DirectoryRole::PrivateControl;
  throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_ROLE");
}
const char* DirectoryRoleName(DirectoryRole role) {
  switch (role) {
    case DirectoryRole::Ancestor: return "ancestor";
    case DirectoryRole::SharedNamespace: return "shared-namespace";
    case DirectoryRole::ProtectedParent: return "protected-parent";
    case DirectoryRole::PrivateControl: return "private-control";
  }
  return "unknown";
}
const char* RightsStateName(RightsState state) {
  switch (state) {
    case RightsState::Satisfied: return "satisfied";
    case RightsState::Violated: return "violated";
    case RightsState::Unavailable: return "unavailable";
    case RightsState::Unsupported: return "unsupported";
  }
  return "unavailable";
}
const char* OwnerClassName(OwnerClass owner) {
  switch (owner) {
    case OwnerClass::Service: return "service";
    case OwnerClass::OsAdministratorCandidate: return "os-administrator-candidate";
    case OwnerClass::Other: return "other";
    case OwnerClass::Unknown: return "unknown";
  }
  return "unknown";
}
RoleRightsEvidence EvaluateDirectoryRights(const RightsFacts& facts, DirectoryRole role,
    const RightsFacts* parent, const RightsFacts* child) {
  RoleRightsEvidence result;
  result.role = role; result.owner_class = facts.owner;
  result.service_access = facts.service_access; result.acl_metadata = facts.acl_metadata;
  if (facts.owner == OwnerClass::Unknown) result.owner = {};
  else if (facts.owner == OwnerClass::Service) result.owner = Pass("exact-service-owner-model");
  else if (role == DirectoryRole::Ancestor && facts.owner == OwnerClass::OsAdministratorCandidate)
    result.owner = Pass("os-administrator-owner-model");
  else result.owner = Fail("foreign-owner");

  result.grant_model = facts.grants;
  if (facts.grants.state == RightsState::Satisfied) {
    auto risks = facts.current_risks;
    if (role == DirectoryRole::SharedNamespace) {
      if (facts.posix && facts.sticky && facts.owner == OwnerClass::Service) risks &= ~DeleteChild;
      risks &= ~ChangeNamespace;
    } else if (role == DirectoryRole::Ancestor && facts.posix && facts.sticky &&
        TrustedModelOwner(facts.owner) && child != nullptr && TrustedModelOwner(child->owner)) {
      risks &= ~(ChangeNamespace | DeleteChild);
    }
    const auto forbidden = mutations | (role == DirectoryRole::PrivateControl ? ReadContent : 0U);
    result.grant_model = (risks & forbidden) ? Fail("untrusted-grant-exceeds-role-model") :
        Pass("conservative-role-grant-model");
  }
  if (role == DirectoryRole::Ancestor) result.inheritance_model = Pass("role-does-not-create-children");
  else {
    result.inheritance_model = facts.inheritance;
    if (facts.inheritance.state == RightsState::Satisfied) {
      const auto forbidden = mutations | (role == DirectoryRole::PrivateControl ? ReadContent : 0U);
      result.inheritance_model = (facts.inherited_risks & forbidden) ?
          Fail("untrusted-inherited-grant") : Pass("conservative-inheritance-model");
    }
  }
  if (parent == nullptr) result.parent_model = Pass("os-anchor-needs-separate-qualification");
  else if (parent->grants.state != RightsState::Satisfied) result.parent_model = parent->grants;
  else {
    const bool protected_sticky = parent->posix && parent->sticky &&
        TrustedModelOwner(parent->owner) && TrustedModelOwner(facts.owner);
    result.parent_model = ((parent->current_risks & DeleteChild) && !protected_sticky) ?
        Fail("untrusted-parent-delete-child") : Pass("conservative-parent-delete-model");
  }
  return result;
}
}  // namespace dss::storage::probe

// A green instrument panel is not permission to open the airlock.
