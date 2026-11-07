/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Private Storage Role Rights
 * 📄 File: packages/storage/native-probe/src/rights-linux.cc
 * 🎯 Purpose: Reads effective descriptor access and bounded POSIX ACL grant facts.
 * 🧠 Responsibilities: Preserves query ambiguity, validates ordered ACL entries and masks.
 * 🏗️ Architecture: Linux-only native adapter; never reconstructs a target pathname.
 * ⚠️ Important: Mode-class bounds are conditional on qualified POSIX filesystem semantics.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include "rights-posix.h"
#include <cerrno>
#include <fcntl.h>
#include <sys/syscall.h>
#include <sys/xattr.h>
#include <unistd.h>

namespace dss::storage::probe {
namespace {
struct AclFacts { RightsCheck check; std::uint32_t risks = 0; };
std::uint16_t Le16(const unsigned char* p) { return static_cast<std::uint16_t>(p[0] | (p[1] << 8)); }
std::uint32_t Le32(const unsigned char* p) { return Le16(p) | (static_cast<std::uint32_t>(Le16(p + 2)) << 16); }
RightsCheck Failure(int error) {
  return {error == ENOTSUP ? RightsState::Unsupported : RightsState::Unavailable,
      "acl-query-unresolved", static_cast<std::uint32_t>(error)};
}
AclFacts ReadAcl(int fd, const char* name, uid_t service) {
  const auto size = ::fgetxattr(fd, name, nullptr, 0);
  if (size < 0) return {Failure(errno), 0};
  if (size < 28 || size > 65536 || (size - 4) % 8 != 0) return {Failure(EINVAL), 0};
  std::vector<unsigned char> bytes(static_cast<std::size_t>(size));
  const auto count = ::fgetxattr(fd, name, bytes.data(), bytes.size());
  if (count < 0) return {Failure(errno), 0};
  if (count != size || Le32(bytes.data()) != 2) return {Failure(EINVAL), 0};
  unsigned owner = 0, group = 0, other = 0, masks = 0, named = 0, mask = 7, ordinary = 0, grouped = 0;
  unsigned phase = 0;
  std::uint32_t previous_user = 0, previous_group = 0;
  bool has_user = false, has_group = false;
  for (std::size_t offset = 4; offset < bytes.size(); offset += 8) {
    const auto tag = Le16(bytes.data() + offset), permissions = Le16(bytes.data() + offset + 2);
    const auto id = Le32(bytes.data() + offset + 4);
    if ((permissions & ~7U) != 0 || ((tag == 2 || tag == 8) ? id == UINT32_MAX : id != UINT32_MAX))
      return {Failure(EINVAL), 0};
    switch (tag) {
      case 1: if (phase != 0 || ++owner != 1) return {Failure(EINVAL), 0}; phase = 1; break;
      case 2:
        if (phase > 2 || !owner || (has_user && id <= previous_user)) return {Failure(EINVAL), 0};
        phase = 2; has_user = true; previous_user = id; ++named;
        if (id != service && id != 0) grouped |= permissions;
        break;
      case 4:
        if (phase > 2 || !owner || ++group != 1) return {Failure(EINVAL), 0};
        phase = 3; grouped |= permissions; break;
      case 8:
        if (phase < 3 || phase > 4 || (has_group && id <= previous_group)) return {Failure(EINVAL), 0};
        phase = 4; has_group = true; previous_group = id; ++named; grouped |= permissions; break;
      case 16:
        if (phase < 3 || phase > 4 || ++masks != 1) return {Failure(EINVAL), 0};
        phase = 5; mask = permissions; break;
      case 32:
        if (phase < 3 || phase > 5 || ++other != 1) return {Failure(EINVAL), 0};
        phase = 6; ordinary = permissions; break;
      default: return {Failure(EINVAL), 0};
    }
  }
  if (owner != 1 || group != 1 || other != 1 || (named && masks != 1)) return {Failure(EINVAL), 0};
  return {{RightsState::Satisfied, "validated-posix-acl-model", 0}, PosixRisks(ordinary | (grouped & mask))};
}
}
RightsFacts ReadDirectoryRights(const NativeObject& object, DirectoryRole role, const RightsContext& context) {
  if (context.kind() != RightsContextKind::Posix) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_CONTEXT");
  const auto* posix = static_cast<const PosixRightsContext*>(&context);
  auto result = ReadPosixDirectoryBase(object, *posix);
  const int fd = static_cast<int>(object.handle());
#if defined(SYS_faccessat2) && defined(AT_EMPTY_PATH) && defined(AT_EACCESS)
  const int access = static_cast<int>(::syscall(SYS_faccessat2, fd, "", RequiredPosixAccess(role), AT_EMPTY_PATH | AT_EACCESS));
  result.service_access = PosixAccessResult(access, access == 0 ? 0 : errno);
#else
  result.service_access = {RightsState::Unsupported, "effective-descriptor-query-unsupported", ENOSYS};
#endif
  const auto current = ReadAcl(fd, "system.posix_acl_access", posix->user());
  result.acl_metadata = current.check;
  // ENODATA never becomes verified absence. The separately labelled mode-class
  // bound remains conditional; every other failed/unsupported query is unknown.
  if (current.check.state != RightsState::Satisfied && current.check.os_code != ENODATA) result.grants = current.check;
  const auto inherited = ReadAcl(fd, "system.posix_acl_default", posix->user());
  result.inheritance = inherited.check;
  result.inherited_risks = inherited.risks;
  return result;
}
}  // namespace dss::storage::probe
