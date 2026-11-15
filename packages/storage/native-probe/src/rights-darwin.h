/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-darwin.h
 * 🎯 Purpose: Declares the length-aware private Darwin ACL decoder.
 * 🧠 Responsibilities: Keeps synthetic decoder controls out of the JavaScript API.
 * 🏗️ Architecture: Native infrastructure contract only.
 * ⚠️ Important: No caller can supply ACL evidence to the capability diagnostic.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include "rights-model.h"
#include <cstddef>
#include <sys/types.h>
namespace dss::storage::probe {
struct DarwinAclFacts { RightsCheck check; std::uint32_t current = 0, inherited = 0; };
DarwinAclFacts DecodeDarwinAcl(const unsigned char* bytes, std::size_t length, uid_t service);
}
