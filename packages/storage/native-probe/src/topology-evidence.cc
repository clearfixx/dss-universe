/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Topology Evidence
 * 📄 File: packages/storage/native-probe/src/topology-evidence.cc
 * 🎯 Purpose: Observes retained directory objects without reopening their paths.
 * 🧠 Responsibilities: Preserves field-level unavailable and unsupported results.
 * 🏗️ Architecture: Private native collection; no Media or application dependency.
 * ⚠️ Important: Neither a metadata snapshot nor filesystem qualification is implied.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"

namespace dss::storage::probe {
std::vector<TopologyEvidence> InspectTopologyChain(const NativeChain& chain) {
  InspectChain(chain);
  std::vector<TopologyEvidence> result;
  result.reserve(chain.components().size());
  for (const auto& component : chain.components()) result.push_back(ReadTopology(*component));
  return result;
}
}  // namespace dss::storage::probe
