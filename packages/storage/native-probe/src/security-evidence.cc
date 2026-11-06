/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/src/security-evidence.cc
 * 🎯 Purpose: Collects fresh security observations from retained chain objects.
 * 🧠 Responsibilities: Enforces security-capture intent and preserves partial metadata states.
 * 🏗️ Architecture: Private native infrastructure; no application dependencies.
 * ⚠️ Important: Observations are not an atomic policy snapshot or admission result.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"

namespace dss::storage::probe {
std::vector<SecurityEvidence> InspectSecurityChain(const NativeChain& chain) {
  if (!chain.security_read()) throw NativeError("ERR_STORAGE_NATIVE_SECURITY_CAPABILITY");
  InspectChain(chain);
  std::vector<SecurityEvidence> result;
  result.reserve(chain.components().size());
  for (const auto& component : chain.components()) result.push_back(ReadSecurity(*component));
  return result;
}
}  // namespace dss::storage::probe
