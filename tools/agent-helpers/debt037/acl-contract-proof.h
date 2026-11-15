/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable POSIX ACL Contract Proof
 * 📄 File: tools/agent-helpers/debt037/acl-contract-proof.h
 * 🎯 Purpose: Shares bounded observations between test-only platform probes.
 * 🧠 Responsibilities: Separates syscall results from any security admission decision.
 * 🏗️ Architecture: Proof executable vocabulary; never imported by API/Worker.
 * ⚠️ Important: No raw identities, ACL buffers or fixture paths enter result records.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include <sys/types.h>

namespace dss::proof {
enum class Control { Empty, NamedAllow, NamedDeny, MaskZero, MaskOpen, InheritedAllow };
struct Observation {
  int stat_rc = -2, stat_error = 0, mode = -1;
  int acl_rc = -2, acl_error = 0, acl_entries = -1;
  int default_rc = -2, default_error = 0, default_entries = -1;
  int statx_rc = -2, statx_error = 0;
  int property_query_rc = -2, property_query_error = 0, property_present = -1;
  int property_get_rc = -2, property_get_error = 0, property_entries = -1;
  int attrs_rc = -2, attrs_error = 0, attrs_complete = 0;
  int attrs_security_returned = -1, attrs_security_length = -1;
};
int SetControl(int fd, Control control, uid_t attacker);
Observation ObserveAcl(int fd);
const char* Platform();
}  // namespace dss::proof
