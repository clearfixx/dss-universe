/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/src/security-win.cc
 * 🎯 Purpose: Observes owner and DACL data from security-readable handles.
 * 🧠 Responsibilities: Distinguishes null/empty ACLs and owns SD/token allocations.
 * 🏗️ Architecture: Private Windows infrastructure, independent of Media policy.
 * ⚠️ Important: ACE observations are not effective rights or historical-handle revocation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <aclapi.h>

namespace dss::storage::probe {
namespace {
struct OwnedDescriptor {
  PSECURITY_DESCRIPTOR value;
  ~OwnedDescriptor() { if (value != nullptr) LocalFree(value); }
};
struct OwnedToken {
  HANDLE value = nullptr;
  ~OwnedToken() { if (value != nullptr) CloseHandle(value); }
};
void CompareProcessOwner(SecurityEvidence& result, PSID owner) {
  OwnedToken token;
  if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token.value)) return;
  DWORD size = 0;
  GetTokenInformation(token.value, TokenUser, nullptr, 0, &size);
  if (size < sizeof(TOKEN_USER) || size > 65536) return;
  std::vector<unsigned char> bytes(size);
  if (!GetTokenInformation(token.value, TokenUser, bytes.data(), size, &size)) return;
  const auto user = reinterpret_cast<const TOKEN_USER*>(bytes.data());
  if (!IsValidSid(user->User.Sid)) return;
  result.owner_match_known = true;
  result.owner_matches_process = EqualSid(owner, user->User.Sid) != FALSE;
}
}
SecurityEvidence ReadSecurity(const NativeObject& object) {
  SecurityEvidence result;
  result.acl.format = "windows-dacl";
  PSID owner = nullptr;
  PACL dacl = nullptr;
  PSECURITY_DESCRIPTOR raw = nullptr;
  const DWORD error = GetSecurityInfo(reinterpret_cast<HANDLE>(object.handle()), SE_FILE_OBJECT,
      OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION, &owner, nullptr, &dacl, nullptr, &raw);
  OwnedDescriptor descriptor {raw};
  if (error != ERROR_SUCCESS || raw == nullptr || !IsValidSecurityDescriptor(raw)) {
    result.acl.os_code = error ? error : ERROR_INVALID_SECURITY_DESCR;
    return result;
  }
  if (owner != nullptr && IsValidSid(owner)) {
    result.owner_known = true;
    result.owner_is_system = IsWellKnownSid(owner, WinLocalSystemSid) != FALSE;
    CompareProcessOwner(result, owner);
  }
  BOOL present = FALSE, defaulted = FALSE;
  if (!GetSecurityDescriptorDacl(raw, &present, &dacl, &defaulted)) {
    result.acl.os_code = GetLastError(); return result;
  }
  if (!present || dacl == nullptr) {
    result.acl.state = EvidenceState::VerifiedAbsent;
    result.acl.shape = present ? "null-dacl" : "absent-dacl";
    result.acl.entries_known = true;
    return result;
  }
  ACL_SIZE_INFORMATION info {};
  if (!IsValidAcl(dacl) || !GetAclInformation(dacl, &info, sizeof(info), AclSizeInformation)) {
    result.acl.os_code = ERROR_INVALID_ACL; return result;
  }
  if (info.AceCount > 4096) { result.acl.os_code = ERROR_MORE_DATA; return result; }
  for (DWORD index = 0; index < info.AceCount; ++index) {
    void* ace = nullptr;
    if (!GetAce(dacl, index, &ace) || ace == nullptr) {
      result.acl.os_code = ERROR_INVALID_ACL; return result;
    }
    const auto header = static_cast<const ACE_HEADER*>(ace);
    if (header->AceSize < sizeof(ACE_HEADER)) { result.acl.os_code = ERROR_INVALID_ACL; return result; }
    if (header->AceType != ACCESS_ALLOWED_ACE_TYPE && header->AceType != ACCESS_DENIED_ACE_TYPE)
      result.acl.unknown_entry_types = true;
    result.acl.inheritance_observed = result.acl.inheritance_observed || (header->AceFlags & 0x1f) != 0;
  }
  result.acl.state = EvidenceState::Present;
  result.acl.shape = info.AceCount == 0 ? "empty-dacl" : "entries";
  result.acl.entries_known = true;
  result.acl.entries = info.AceCount;
  return result;
}
}  // namespace dss::storage::probe
