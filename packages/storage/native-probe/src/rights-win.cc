/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-win.cc
 * 🎯 Purpose: Reads Windows owner, service-token access and conservative allow-grant facts.
 * 🧠 Responsibilities: Owns tokens/SD buffers, rejects impersonation mismatch and unknown ACE semantics.
 * 🏗️ Architecture: Private Win32 adapter; no Node values or application policy imports.
 * ⚠️ Important: AccessCheck is token-specific; current DACLs do not revoke old handles.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include "rights-model.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <aclapi.h>
#include <cstring>
#include <cstddef>

namespace dss::storage::probe {
namespace {
struct OwnedHandle { HANDLE value = nullptr; ~OwnedHandle() { if (value) CloseHandle(value); } };
struct OwnedDescriptor { PSECURITY_DESCRIPTOR value = nullptr; ~OwnedDescriptor() { if (value) LocalFree(value); } };
struct Fingerprint { std::vector<unsigned char> sid; LUID authentication {}, modified {}; };
void ContextRequire(bool condition, DWORD error = 0) {
  if (!condition) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", error ? error : GetLastError());
}
void NoImpersonation() {
  OwnedHandle thread;
  const BOOL opened = OpenThreadToken(GetCurrentThread(), TOKEN_QUERY, TRUE, &thread.value);
  if (opened) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT", ERROR_NOT_SUPPORTED);
  ContextRequire(GetLastError() == ERROR_NO_TOKEN);
}
bool SameLuid(LUID left, LUID right) { return left.LowPart == right.LowPart && left.HighPart == right.HighPart; }
Fingerprint ReadFingerprint(HANDLE token) {
  TOKEN_STATISTICS before {}, after {};
  DWORD returned = 0;
  ContextRequire(GetTokenInformation(token, TokenStatistics, &before, sizeof(before), &returned) != FALSE);
  DWORD size = 0;
  GetTokenInformation(token, TokenUser, nullptr, 0, &size);
  ContextRequire(size >= sizeof(TOKEN_USER) && size <= 65536, ERROR_INVALID_DATA);
  std::vector<unsigned char> bytes(size);
  ContextRequire(GetTokenInformation(token, TokenUser, bytes.data(), size, &returned) != FALSE);
  const auto user = reinterpret_cast<const TOKEN_USER*>(bytes.data());
  const auto pointer = reinterpret_cast<std::uintptr_t>(user->User.Sid);
  const auto start = reinterpret_cast<std::uintptr_t>(bytes.data());
  ContextRequire(pointer >= start && pointer - start <= bytes.size() &&
      bytes.size() - (pointer - start) >= 8, ERROR_INVALID_SID);
  const auto* sid_bytes = static_cast<const unsigned char*>(user->User.Sid);
  ContextRequire(8U + static_cast<unsigned>(sid_bytes[1]) * sizeof(DWORD) <= bytes.size() - (pointer - start), ERROR_INVALID_SID);
  ContextRequire(IsValidSid(user->User.Sid) != FALSE, ERROR_INVALID_SID);
  const DWORD sid_size = GetLengthSid(user->User.Sid);
  ContextRequire(sid_size <= SECURITY_MAX_SID_SIZE && sid_size <= bytes.size() - (pointer - start), ERROR_INVALID_SID);
  Fingerprint result;
  result.sid.resize(sid_size);
  ContextRequire(CopySid(sid_size, result.sid.data(), user->User.Sid) != FALSE);
  ContextRequire(GetTokenInformation(token, TokenStatistics, &after, sizeof(after), &returned) != FALSE);
  ContextRequire(SameLuid(before.ModifiedId, after.ModifiedId), ERROR_RETRY);
  result.authentication = after.AuthenticationId; result.modified = after.ModifiedId;
  return result;
}
class WindowsContext final : public RightsContext {
 public:
  Fingerprint fingerprint;
  OwnedHandle access_token;
  RightsContextKind kind() const override { return RightsContextKind::Windows; }
  WindowsContext() {
    NoImpersonation();
    OwnedHandle primary;
    ContextRequire(OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY | TOKEN_DUPLICATE, &primary.value) != FALSE);
    fingerprint = ReadFingerprint(primary.value);
    ContextRequire(DuplicateTokenEx(primary.value, TOKEN_QUERY, nullptr, SecurityImpersonation,
        TokenImpersonation, &access_token.value) != FALSE);
    ContextRequire(MatchesCurrent(), ERROR_RETRY);
  }
  bool MatchesCurrent() const override {
    NoImpersonation();
    OwnedHandle primary;
    ContextRequire(OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &primary.value) != FALSE);
    const auto current = ReadFingerprint(primary.value);
    return current.sid == fingerprint.sid && SameLuid(current.authentication, fingerprint.authentication) &&
        SameLuid(current.modified, fingerprint.modified);
  }
};
RightsCheck Known(const char* reason) { return {RightsState::Satisfied, reason, 0}; }
RightsCheck Unknown(DWORD code) { return {RightsState::Unavailable, "security-query-failed", code}; }
RightsCheck Unsupported() { return {RightsState::Unsupported, "unsupported-ace-model", ERROR_NOT_SUPPORTED}; }
bool Administrator(PSID sid) {
  return IsWellKnownSid(sid, WinLocalSystemSid) || IsWellKnownSid(sid, WinBuiltinAdministratorsSid);
}
DWORD Desired(DirectoryRole role) {
  DWORD desired = READ_CONTROL | FILE_READ_ATTRIBUTES | FILE_TRAVERSE;
  if (role != DirectoryRole::Ancestor) desired |= FILE_ADD_FILE | FILE_ADD_SUBDIRECTORY;
  if (role == DirectoryRole::PrivateControl) desired |= FILE_LIST_DIRECTORY | FILE_DELETE_CHILD;
  return desired;
}
GENERIC_MAPPING Mapping() { return {FILE_GENERIC_READ, FILE_GENERIC_WRITE, FILE_GENERIC_EXECUTE, FILE_ALL_ACCESS}; }
std::uint32_t Risks(DWORD mask) {
  std::uint32_t result = 0;
  if (mask & FILE_LIST_DIRECTORY) result |= ReadContent;
  if (mask & (FILE_ADD_FILE | FILE_ADD_SUBDIRECTORY)) result |= ChangeNamespace;
  if (mask & (WRITE_DAC | WRITE_OWNER | FILE_WRITE_ATTRIBUTES | FILE_WRITE_EA)) result |= ChangeMetadata;
  if (mask & DELETE) result |= DeleteObject;
  if (mask & FILE_DELETE_CHILD) result |= DeleteChild;
  if (mask & FILE_TRAVERSE) result |= Traverse;
  return result;
}
RightsCheck ServiceAccess(PSECURITY_DESCRIPTOR descriptor, HANDLE token, DirectoryRole role) {
  auto mapping = Mapping();
  DWORD desired = Desired(role);
  MapGenericMask(&desired, &mapping);
  // AccessCheck returns the required privilege buffer size without performing a grant on failure.
  DWORD size = sizeof(PRIVILEGE_SET), granted = 0;
  std::vector<unsigned char> bytes(size);
  BOOL allowed = FALSE;
  if (!AccessCheck(descriptor, token, desired, &mapping,
      reinterpret_cast<PPRIVILEGE_SET>(bytes.data()), &size, &granted, &allowed)) {
    const DWORD error = GetLastError();
    if (error != ERROR_INSUFFICIENT_BUFFER || size < sizeof(PRIVILEGE_SET) || size > 65536) return Unknown(error);
    bytes.resize(size);
    if (!AccessCheck(descriptor, token, desired, &mapping,
        reinterpret_cast<PPRIVILEGE_SET>(bytes.data()), &size, &granted, &allowed)) return Unknown(GetLastError());
  }
  return {allowed ? RightsState::Satisfied : RightsState::Violated,
      allowed ? "kernel-service-access" : "kernel-service-denied", 0};
}
}
std::shared_ptr<RightsContext> CaptureRightsContext() { return std::make_shared<WindowsContext>(); }
RightsFacts ReadDirectoryRights(const NativeObject& object, DirectoryRole role, const RightsContext& context) {
  ContextRequire(context.kind() == RightsContextKind::Windows, ERROR_INVALID_PARAMETER);
  const auto* windows = static_cast<const WindowsContext*>(&context);
  ContextRequire(windows->MatchesCurrent(), ERROR_INVALID_PARAMETER);
  RightsFacts result;
  OwnedDescriptor descriptor;
  PSID owner = nullptr;
  PACL dacl = nullptr;
  const DWORD error = GetSecurityInfo(reinterpret_cast<HANDLE>(object.handle()), SE_FILE_OBJECT,
      OWNER_SECURITY_INFORMATION | GROUP_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION, &owner, nullptr, &dacl, nullptr, &descriptor.value);
  if (error != ERROR_SUCCESS || !descriptor.value || !IsValidSecurityDescriptor(descriptor.value) ||
      !owner || !IsValidSid(owner)) {
    result.acl_metadata = result.grants = result.inheritance = Unknown(error ? error : ERROR_INVALID_SECURITY_DESCR);
    result.service_access = result.acl_metadata; return result;
  }
  result.owner = EqualSid(owner, const_cast<unsigned char*>(windows->fingerprint.sid.data())) ? OwnerClass::Service :
      Administrator(owner) ? OwnerClass::OsAdministratorCandidate : OwnerClass::Other;
  result.service_access = ServiceAccess(descriptor.value, windows->access_token.value, role);
  BOOL present = FALSE, defaulted = FALSE;
  if (!GetSecurityDescriptorDacl(descriptor.value, &present, &dacl, &defaulted)) {
    result.acl_metadata = result.grants = result.inheritance = Unknown(GetLastError()); return result;
  }
  result.acl_metadata = result.grants = result.inheritance = Known("validated-windows-dacl-model");
  if (!present || !dacl) {
    result.current_risks = result.inherited_risks = ReadContent | ChangeNamespace | ChangeMetadata | DeleteObject | DeleteChild;
    return result;
  }
  ACL_SIZE_INFORMATION size {};
  if (!IsValidAcl(dacl) || !GetAclInformation(dacl, &size, sizeof(size), AclSizeInformation) || size.AceCount > 4096) {
    result.acl_metadata = result.grants = result.inheritance = Unknown(ERROR_INVALID_ACL); return result;
  }
  for (DWORD index = 0; index < size.AceCount; ++index) {
    void* raw = nullptr;
    if (!GetAce(dacl, index, &raw) || !raw) {
      result.acl_metadata = result.grants = result.inheritance = Unknown(ERROR_INVALID_ACL); return result;
    }
    const auto* header = static_cast<const ACE_HEADER*>(raw);
    if ((header->AceType != ACCESS_ALLOWED_ACE_TYPE && header->AceType != ACCESS_DENIED_ACE_TYPE) ||
        (header->AceFlags & ~0x1fU) != 0) {
      result.grants = result.inheritance = Unsupported(); return result;
    }
    constexpr auto sid_offset = offsetof(ACCESS_ALLOWED_ACE, SidStart);
    if (header->AceSize < sid_offset + 8) {
      result.acl_metadata = result.grants = result.inheritance = Unknown(ERROR_INVALID_ACL); return result;
    }
    const auto* ace = static_cast<const ACCESS_ALLOWED_ACE*>(raw);
    PSID sid = const_cast<DWORD*>(&ace->SidStart);
    // Bound SID length before IsValidSid can inspect its complete body.
    const auto* sid_bytes = static_cast<const unsigned char*>(sid);
    const auto required = 8U + static_cast<unsigned>(sid_bytes[1]) * sizeof(DWORD);
    if (required > header->AceSize - sid_offset || !IsValidSid(sid)) {
      result.acl_metadata = result.grants = result.inheritance = Unknown(ERROR_INVALID_SID); return result;
    }
    DWORD mask = ace->Mask;
    auto mapping = Mapping(); MapGenericMask(&mask, &mapping);
    if ((mask & ~static_cast<DWORD>(FILE_ALL_ACCESS)) != 0 || IsWellKnownSid(sid, WinCreatorOwnerSid) ||
        IsWellKnownSid(sid, WinCreatorGroupSid) || IsWellKnownSid(sid, WinCreatorOwnerRightsSid)) {
      result.grants = result.inheritance = Unsupported(); return result;
    }
    if (header->AceType == ACCESS_DENIED_ACE_TYPE) continue;  // No subtractive deny credit.
    if (EqualSid(sid, const_cast<unsigned char*>(windows->fingerprint.sid.data())) || Administrator(sid)) continue;
    const auto risks = Risks(mask);
    if (!(header->AceFlags & INHERIT_ONLY_ACE)) result.current_risks |= risks;
    if (header->AceFlags & (OBJECT_INHERIT_ACE | CONTAINER_INHERIT_ACE)) result.inherited_risks |= risks;
  }
  return result;
}
}  // namespace dss::storage::probe
