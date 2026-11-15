/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-posix.h
 * 🎯 Purpose: Shares private POSIX credential and mode-reader contracts.
 * 🧠 Responsibilities: Keeps native UID/GID/group state out of every serialized observation.
 * 🏗️ Architecture: Platform-only declarations; no permission model implementation.
 * ⚠️ Important: Candidate UID0 identity does not qualify a host or mount identity domain.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include "rights-model.h"
#include <sys/types.h>
#include <utility>

namespace dss::storage::probe {
struct PosixCredentialFrame {
  uid_t uid, effective_uid;
  gid_t gid, effective_gid;
  std::vector<gid_t> groups;
};
class PosixRightsContext final : public RightsContext {
 public:
  explicit PosixRightsContext(PosixCredentialFrame frame) : frame_(std::move(frame)) {}
  bool MatchesCurrent() const override;
  RightsContextKind kind() const override { return RightsContextKind::Posix; }
  uid_t user() const noexcept { return frame_.effective_uid; }
 private:
  PosixCredentialFrame frame_;
};
RightsFacts ReadPosixDirectoryBase(const NativeObject& object, const PosixRightsContext& context);
std::uint32_t PosixRisks(unsigned permissions);
int RequiredPosixAccess(DirectoryRole role);
RightsCheck PosixAccessResult(int result, int error);
}  // namespace dss::storage::probe
