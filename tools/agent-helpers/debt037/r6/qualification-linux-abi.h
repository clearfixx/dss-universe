/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/qualification-linux-abi.h
 * 🎯 Purpose: Describes only the reviewed Linux mount-basic wire prefix used by this probe.
 * 🧠 Responsibilities: Fixes request/response extents and checks installed UAPI layout when present.
 * 🏗️ Architecture: Standalone test-only ABI facts, no copied kernel implementation or new package.
 * ⚠️ Important: Syscall numbers and unique-mount support must still come from installed headers.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
#include <cstddef>
#include <cstdint>
#include <linux/mount.h>
namespace dss::storage::qualification_proof {
// Linux v6.14 include/uapi/linux/mount.h and fs/namespace.c
// copy_mnt_id_req / prepare_kstatmount / copy_statmount_to_user:
// request version0 is24 bytes; mount-basic can return a bounded fixed prefix.
// No string fields are requested. No syscall ordinal is declared here.
struct MountRequestV0 {
  std::uint32_t size = 24, spare = 0;
  std::uint64_t mnt_id = 0, param = 2;
};
struct MountBasicPrefix {
  std::uint32_t size = 0, spare = 0;
  std::uint64_t mask = 0;
  std::uint32_t device_major = 0, device_minor = 0;
  std::uint64_t magic = 0;
  std::uint32_t super_flags = 0, fs_type = 0;
  std::uint64_t mnt_id = 0, parent_id = 0;
  std::uint32_t old_id = 0, old_parent_id = 0;
  std::uint64_t mnt_attr = 0;
};
inline constexpr std::uint64_t MountBasicMask = 2;
static_assert(sizeof(MountRequestV0) == 24 && offsetof(MountRequestV0, param) == 16);
static_assert(sizeof(MountBasicPrefix) == 72 && offsetof(MountBasicPrefix, mask) == 8 &&
    offsetof(MountBasicPrefix, mnt_id) == 40 && offsetof(MountBasicPrefix, mnt_attr) == 64);
#if defined(STATMOUNT_MNT_BASIC)
static_assert(STATMOUNT_MNT_BASIC == MountBasicMask && MNT_ID_REQ_SIZE_VER0 == sizeof(MountRequestV0));
static_assert(offsetof(struct statmount, mask) == offsetof(MountBasicPrefix, mask) &&
    offsetof(struct statmount, mnt_id) == offsetof(MountBasicPrefix, mnt_id) &&
    offsetof(struct statmount, mnt_attr) == offsetof(MountBasicPrefix, mnt_attr));
#endif
}  // namespace dss::storage::qualification_proof
