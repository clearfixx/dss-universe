/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/src/security-evidence.h
 * 🎯 Purpose: Defines bounded observations without raw OS identities or ACL bytes.
 * 🧠 Responsibilities: Distinguishes evidence availability from security policy.
 * 🏗️ Architecture: Node-independent data vocabulary, not an admission decision.
 * ⚠️ Important: Verified ACL absence is not equivalent to safe permissions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include <cstdint>
#include <vector>

namespace dss::storage::probe {
enum class EvidenceState { Present, VerifiedAbsent, Unavailable, Unsupported };
struct AclEvidence {
  EvidenceState state = EvidenceState::Unavailable;
  const char* format = "unknown";
  const char* shape = "unknown";
  std::uint32_t os_code = 0;
  bool entries_known = false;
  std::uint32_t entries = 0;
  bool unknown_entry_types = false;
  bool inheritance_observed = false;
};
struct SecurityEvidence {
  bool owner_known = false;
  bool owner_match_known = false;
  bool owner_matches_process = false;
  bool owner_is_system = false;
  bool mode_known = false;
  bool group_write = false;
  bool other_write = false;
  bool sticky = false;
  AclEvidence acl;
  bool default_acl_applicable = false;
  AclEvidence default_acl;
};
}  // namespace dss::storage::probe
