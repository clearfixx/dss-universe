/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/src/native-object.cc
 *
 * 🎯 Purpose:
 * Rejects namespace traversal before native relative opening.
 *
 * 🧠 Responsibilities:
 * • Checks single-component inputs before any OS operation.
 *
 * 🏗️ Architecture:
 * Shared native technical validation; portable key policy remains separate.
 *
 * ⚠️ Important:
 * No absolute or multicomponent path escape is admitted here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"

namespace dss::storage::probe {
void ValidateComponent(const std::string& name) {
  if (name.empty() || name == "." || name == ".." ||
      name.find_first_of("/\\:") != std::string::npos ||
      name.find('\0') != std::string::npos) {
    throw NativeError("ERR_STORAGE_NATIVE_COMPONENT");
  }
}
}  // namespace dss::storage::probe
