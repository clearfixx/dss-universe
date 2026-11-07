/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/qualification-proof.h
 * 🎯 Purpose: Separates test-only OS facts from bounded diagnostic projection.
 * 🧠 Responsibilities: Models explicit availability without an admission verdict.
 * 🏗️ Architecture: Private standalone executable contract, outside the addon.
 * ⚠️ Important: Values describe queries; neither false nor unknown qualifies storage.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include "../../../../packages/storage/native-probe/src/native-object.h"
#include <cstddef>
#include <cstdint>

namespace dss::storage::qualification_proof {
enum class State { Present, Unavailable, Unsupported };
struct Fact {
  State state = State::Unsupported;
  int value = -1;
  std::uint32_t error = 0;
};
struct Evidence {
  Fact remote_device, removable_media, ownership_ignored, snapshot, read_only;
  Fact idmapped, mount_bound, namespace_context;
};
using dss::storage::probe::NativeObject;
Evidence ObservePlatform(const NativeObject& object);
bool DecoderControls();
bool OrdinaryContext();
inline Fact Present(bool value) { return {State::Present, value ? 1 : 0, 0}; }
inline Fact Unavailable(std::uint32_t error) { return {State::Unavailable, -1, error}; }
inline Fact Unsupported(std::uint32_t error) { return {State::Unsupported, -1, error}; }
}  // namespace dss::storage::qualification_proof
