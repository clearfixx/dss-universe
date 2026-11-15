/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-linux.h
 * 🎯 Purpose: Declares a length-aware private POSIX ACL wire decoder.
 * 🧠 Responsibilities: Keeps synthetic parser inputs outside the addon API.
 * 🏗️ Architecture: Linux infrastructure declarations only.
 * ⚠️ Important: Successful parsing does not qualify a filesystem or principal domain.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include "rights-model.h"
#include <sys/types.h>
namespace dss::storage::probe {
struct LinuxAclFacts { RightsCheck check; std::uint32_t risks = 0; };
LinuxAclFacts DecodeLinuxAcl(const std::vector<unsigned char>& bytes, uid_t service);
}
