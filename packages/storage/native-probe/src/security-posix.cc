/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/src/security-posix.cc
 * 🎯 Purpose: Reads owner and mode facts from captured POSIX descriptors.
 * 🧠 Responsibilities: Avoids pathname lookups and serializing native user/group identities.
 * 🏗️ Architecture: Private native infrastructure; no application dependencies.
 * ⚠️ Important: Mode facts are not effective ACL or supplementary-group authorization.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "native-object.h"
#include <cerrno>
#include <sys/stat.h>
#include <unistd.h>

namespace dss::storage::probe {
SecurityEvidence ReadPosixSecurityBase(const NativeObject& object) {
  struct stat info {};
  if (::fstat(static_cast<int>(object.handle()), &info) != 0)
    throw NativeError("ERR_STORAGE_NATIVE_IO", static_cast<std::uint32_t>(errno));
  SecurityEvidence result;
  result.owner_known = true;
  result.owner_match_known = true;
  result.owner_matches_process = info.st_uid == ::geteuid();
  result.owner_is_system = info.st_uid == 0;
  result.mode_known = true;
  result.group_write = (info.st_mode & S_IWGRP) != 0;
  result.other_write = (info.st_mode & S_IWOTH) != 0;
  result.sticky = (info.st_mode & S_ISVTX) != 0;
  return result;
}
}  // namespace dss::storage::probe
