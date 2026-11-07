/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Rights Verification
 * 📄 File: packages/storage/native-probe/rights-test-posix.cc
 * 🎯 Purpose: Builds fresh ACL fixtures and malformed Darwin decoder controls.
 * 🧠 Responsibilities: Uses public OS interfaces and labels synthetic parser negatives.
 * 🏗️ Architecture: Test executable only; no application or addon export.
 * ⚠️ Important: Never repairs existing uploads; caller supplies a new test directory.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "rights-test-posix.h"
#include <cstring>
#include <cstdlib>
#include <cerrno>
#include <cstdint>
#include <stdexcept>
#include <vector>
#include <fcntl.h>
#include <unistd.h>
#if defined(__linux__)
#include <sys/xattr.h>
#else
#include "src/rights-darwin.h"
#include <membership.h>
#include <sys/acl.h>
#include <uuid/uuid.h>
#endif
namespace {
void Require(bool ok) { if (!ok) throw std::runtime_error("POSIX rights control failed"); }
struct Fd { int value; ~Fd() { if (value >= 0) ::close(value); } };
#if defined(__APPLE__)
struct Acl { acl_t value; ~Acl() { if (value) ::acl_free(value); } };
#else
void U16(std::vector<unsigned char>& out, unsigned value) {
  out.push_back(static_cast<unsigned char>(value)); out.push_back(static_cast<unsigned char>(value >> 8));
}
void U32(std::vector<unsigned char>& out, std::uint32_t value) { U16(out, value & 65535); U16(out, value >> 16); }
void Entry(std::vector<unsigned char>& out, unsigned tag, unsigned permissions, std::uint32_t id = UINT32_MAX) {
  U16(out, tag); U16(out, permissions); U32(out, id);
}
#endif
}
void PreparePosixRightsFixture(const char* path, const char* control, const char* identity) {
  char* end = nullptr;
  errno = 0;
  const auto user = std::strtoul(identity, &end, 10);
  Require(!errno && end != identity && *end == '\0' && user < UINT32_MAX);
  const bool safe = std::strcmp(control, "safe") == 0, allow = std::strcmp(control, "allow") == 0,
      inherited = std::strcmp(control, "inherited") == 0, deny = std::strcmp(control, "deny") == 0;
  Require(safe || allow || inherited || deny);
  Fd fd {::open(path, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)};
  Require(fd.value >= 0);
#if defined(__linux__)
  Require(!deny); // Linux POSIX ACLs have no deny entry.
  std::vector<unsigned char> bytes;
  U32(bytes, 2); Entry(bytes, 1, 7); Entry(bytes, 2, 7, static_cast<std::uint32_t>(user));
  Entry(bytes, 4, 0); Entry(bytes, 16, safe ? 0 : 7); Entry(bytes, 32, 0);
  Require(::fsetxattr(fd.value, inherited || safe ? "system.posix_acl_default" : "system.posix_acl_access",
      bytes.data(), bytes.size(), 0) == 0);
#else
  Acl acl {::acl_init(safe ? 0 : deny ? 2 : 1)};
  Require(acl.value != nullptr);
  if (!safe) {
    uuid_t id;
    Require(::mbr_uid_to_uuid(static_cast<uid_t>(user), id) == 0);
    for (int index = 0; index < (deny ? 2 : 1); ++index) {
      acl_entry_t entry;
      Require(::acl_create_entry(&acl.value, &entry) == 0 &&
          ::acl_set_tag_type(entry, deny && index == 0 ? ACL_EXTENDED_DENY : ACL_EXTENDED_ALLOW) == 0 &&
          ::acl_set_qualifier(entry, id) == 0);
      acl_permset_t permissions;
      Require(::acl_get_permset(entry, &permissions) == 0 && ::acl_add_perm(permissions, ACL_ADD_FILE) == 0 &&
          ::acl_add_perm(permissions, ACL_SEARCH) == 0 && ::acl_set_permset(entry, permissions) == 0);
      if (inherited) {
        acl_flagset_t flags;
        Require(::acl_get_flagset_np(entry, &flags) == 0 && ::acl_add_flag_np(flags, ACL_ENTRY_ONLY_INHERIT) == 0 &&
            ::acl_add_flag_np(flags, ACL_ENTRY_DIRECTORY_INHERIT) == 0 && ::acl_set_flagset_np(entry, flags) == 0);
      }
    }
  }
  Require(::acl_set_fd_np(fd.value, acl.value, ACL_TYPE_EXTENDED) == 0);
#endif
}
void PosixDecoderControls() {
#if defined(__APPLE__)
  using namespace dss::storage::probe;
  Acl empty {::acl_init(0)};
  Require(empty.value != nullptr);
  const auto size = ::acl_size(empty.value);
  Require(size > 0 && size < 65536);
  std::vector<unsigned char> bytes(static_cast<std::size_t>(size));
  Require(::acl_copy_ext_native(bytes.data(), empty.value, size) == size);
  Require(DecodeDarwinAcl(bytes.data(), bytes.size(), ::geteuid()).check.state == RightsState::Satisfied);
  Require(DecodeDarwinAcl(bytes.data(), bytes.size() - 1, ::geteuid()).check.state != RightsState::Satisfied);
  Require(DecodeDarwinAcl(nullptr, 0, ::geteuid()).check.state != RightsState::Satisfied);
  auto malformed = bytes; malformed[0] ^= 255;
  Require(DecodeDarwinAcl(malformed.data(), malformed.size(), ::geteuid()).check.state != RightsState::Satisfied);
  struct kauth_filesec header {};
  std::memcpy(&header, bytes.data(), KAUTH_FILESEC_SIZE(0));
  header.fsec_entrycount = ACL_MAX_ENTRIES + 1;
  std::memcpy(bytes.data(), &header, KAUTH_FILESEC_SIZE(0));
  Require(DecodeDarwinAcl(bytes.data(), bytes.size(), ::geteuid()).check.state != RightsState::Satisfied);
#endif
}
