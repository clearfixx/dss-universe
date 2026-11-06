/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Topology Evidence
 * 📄 File: packages/storage/native-probe/src/topology-evidence.h
 * 🎯 Purpose: Keeps native identity bytes private while modelling field availability.
 * 🧠 Responsibilities: Distinguishes object, filesystem and mount observations.
 * 🏗️ Architecture: Node-independent private infrastructure vocabulary.
 * ⚠️ Important: Matching observations are not admitted roots or persistent identity promises.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include <cstdint>
#include <vector>

namespace dss::storage::probe {
enum class TopologyState { Present, Unavailable, Unsupported };
struct IdentityObservation {
  TopologyState state = TopologyState::Unavailable;
  const char* kind = "unknown";
  std::uint32_t os_code = 0;
  std::vector<unsigned char> bytes;
};
struct TopologyEvidence {
  IdentityObservation object, device, filesystem, mount;
  const char* filesystem_family = "unknown";
  bool flags_known = false;
  std::uint32_t flags_os_code = 0;
  bool read_only = false;
  bool local_known = false;
  bool local = false;
  bool persistent_acl_known = false;
  bool persistent_acl = false;
};
inline void AppendIdentity(std::vector<unsigned char>& bytes, std::uint64_t value) {
  for (unsigned shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<unsigned char>(value >> shift));
}
}  // namespace dss::storage::probe
