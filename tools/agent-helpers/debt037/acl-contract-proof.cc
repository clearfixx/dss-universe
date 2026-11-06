/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable POSIX ACL Contract Proof
 * 📄 File: tools/agent-helpers/debt037/acl-contract-proof.cc
 * 🎯 Purpose: Runs real service/attacker processes against newly created ACL fixtures.
 * 🧠 Responsibilities: Guards hosted CI, drops credentials, uses pipe barriers and emits bounded evidence.
 * 🏗️ Architecture: Test-only executable; no Node addon, production capability or application import.
 * ⚠️ Important: Root is orchestration only; every fixture operation runs as an ordinary actor.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "acl-contract-proof.h"
#include <cerrno>
#include <climits>
#include <csignal>
#include <cstdlib>
#include <cstring>
#include <functional>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <fcntl.h>
#include <grp.h>
#include <pwd.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

namespace dss::proof {
namespace {
const char* stage = "guard";
struct Account { uid_t uid; gid_t gid; };
struct Outcome { int rc = -1; int error = 0; int identity_checked = 0; Observation observation; };
struct Readiness { int check = 0, error = 0, groups = -1, only_actor_group = 0, root_group = 0; };
struct OwnedFd { int value; ~OwnedFd() { if (value >= 0) ::close(value); } };
void Require(bool condition) { if (!condition) throw std::runtime_error("proof condition failed"); }
std::string Label(const char* text) {
  std::string result(text);
  for (char& ch : result) { if (ch == '/') ch = '-'; Require((ch >= 'a' && ch <= 'z') || ch == '-' || (ch >= '0' && ch <= '9')); }
  return result;
}
bool Environment(const char* name, const char* expected) {
  const char* value = std::getenv(name); return value && std::strcmp(value, expected) == 0;
}
unsigned long long Number(const char* value) {
  Require(value && *value);
  for (const char* p = value; *p; ++p) Require(*p >= '0' && *p <= '9');
  errno = 0;
  char* end = nullptr;
  const auto result = std::strtoull(value, &end, 10);
  Require(errno == 0 && end && !*end);
  return result;
}
bool Transfer(int fd, void* bytes, std::size_t count, bool writing) {
  auto* cursor = static_cast<unsigned char*>(bytes);
  while (count) {
    const auto size = writing ? ::write(fd, cursor, count) : ::read(fd, cursor, count);
    if (size < 0 && errno == EINTR) continue;
    if (size <= 0) return false;
    cursor += size; count -= static_cast<std::size_t>(size);
  }
  return true;
}
struct ChildLifetime {
  pid_t pid;
  int start, output;
  bool waited = false;
  ~ChildLifetime() {
    if (start >= 0) ::close(start);
    if (output >= 0) ::close(output);
    if (!waited) { int status; while (::waitpid(pid, &status, 0) < 0 && errno == EINTR) {} }
  }
};
Outcome RunAs(Account actor, rlim_t limit, const std::function<Outcome()>& action) {
  int start[2], output[2];
  Require(::pipe(start) == 0);
  if (::pipe(output) != 0) { ::close(start[0]); ::close(start[1]); Require(false); }
  const pid_t pid = ::fork();
  if (pid < 0) { for (int fd : {start[0], start[1], output[0], output[1]}) ::close(fd); Require(false); }
  if (pid == 0) {
    ::close(start[1]); ::close(output[0]);
    for (int fd = 3; static_cast<rlim_t>(fd) < limit; ++fd)
      if (fd != start[0] && fd != output[1]) ::close(fd);
    Readiness ready;
    auto check = [&](int code, bool success) { if (!success && !ready.check) { ready.check = code; ready.error = errno; } };
    errno = 0; check(1, ::setgroups(0, nullptr) == 0);
    errno = 0; check(2, ::setgid(actor.gid) == 0);
    errno = 0; check(3, ::setuid(actor.uid) == 0);
    errno = 0; check(4, ::getuid() == actor.uid);
    check(5, ::geteuid() == actor.uid); check(6, ::getgid() == actor.gid); check(7, ::getegid() == actor.gid);
    errno = 0; ready.groups = ::getgroups(0, nullptr);
    if (ready.groups >= 0 && ready.groups <= 64) {
      gid_t groups[64] {};
      if (::getgroups(64, groups) == ready.groups) {
        ready.only_actor_group = 1;
        for (int index = 0; index < ready.groups; ++index) {
          if (groups[index] != actor.gid) ready.only_actor_group = 0;
          if (groups[index] == 0) ready.root_group = 1;
        }
      }
    }
    check(8, ready.groups == 0);
    errno = 0; check(9, ::seteuid(0) == -1 && errno == EPERM);
    if (!Transfer(output[1], &ready, sizeof(ready), true) || ready.check) ::_exit(2);
    unsigned char go = 0;
    if (!Transfer(start[0], &go, 1, false) || go != 'G') ::_exit(3);
    ::close(start[0]);
    try {
      Outcome result = action();
      result.identity_checked = 1;
      const bool sent = Transfer(output[1], &result, sizeof(result), true);
      ::close(output[1]); ::_exit(sent ? 0 : 4);
    } catch (...) { ::close(output[1]); ::_exit(5); }
  }
  ::close(start[0]); ::close(output[1]);
  ChildLifetime child {pid, start[1], output[0]};
  Readiness ready;
  Require(Transfer(child.output, &ready, sizeof(ready), false));
  if (ready.check) std::cout << "{\"kind\":\"dss.acl-contract.identity-failure\",\"checkCode\":" << ready.check
      << ",\"error\":" << ready.error << ",\"groupCount\":" << ready.groups
      << ",\"onlyActorGroup\":" << (ready.only_actor_group ? "true" : "false")
      << ",\"rootGroup\":" << (ready.root_group ? "true" : "false") << "}" << std::endl;
  Require(ready.check == 0);
  unsigned char go = 'G';
  Require(Transfer(child.start, &go, 1, true));
  ::close(child.start); child.start = -1;
  Outcome result;
  Require(Transfer(child.output, &result, sizeof(result), false));
  int status = 0;
  pid_t waited;
  do { waited = ::waitpid(pid, &status, 0); } while (waited < 0 && errno == EINTR);
  Require(waited == pid); child.waited = true;
  Require(WIFEXITED(status) && WEXITSTATUS(status) == 0 && result.identity_checked == 1);
  return result;
}
void Record(const char* label, const char* actor, const char* operation, const Outcome& result) {
  const auto& q = result.observation;
  std::cout << "{\"kind\":\"dss.acl-contract.record\",\"stage\":\"" << Label(label)
      << "\",\"actor\":\"" << actor << "\",\"operation\":\"" << operation
      << "\",\"identityChecked\":true,\"rc\":" << result.rc << ",\"error\":" << result.error
      << ",\"statRc\":" << q.stat_rc << ",\"statError\":" << q.stat_error << ",\"mode\":" << q.mode
      << ",\"aclRc\":" << q.acl_rc << ",\"aclError\":" << q.acl_error << ",\"aclEntries\":" << q.acl_entries
      << ",\"defaultRc\":" << q.default_rc << ",\"defaultError\":" << q.default_error << ",\"defaultEntries\":" << q.default_entries
      << ",\"statxRc\":" << q.statx_rc << ",\"statxError\":" << q.statx_error
      << ",\"propertyQueryRc\":" << q.property_query_rc << ",\"propertyQueryError\":" << q.property_query_error
      << ",\"propertyPresent\":" << q.property_present << ",\"propertyGetRc\":" << q.property_get_rc
      << ",\"propertyGetError\":" << q.property_get_error << ",\"propertyEntries\":" << q.property_entries
      << ",\"attrsRc\":" << q.attrs_rc << ",\"attrsError\":" << q.attrs_error
      << ",\"attrsComplete\":" << q.attrs_complete << ",\"attrsSecurityReturned\":" << q.attrs_security_returned
      << ",\"attrsSecurityLength\":" << q.attrs_security_length << "}" << std::endl;
}
struct Harness {
  Account service, attacker;
  rlim_t limit;
  std::string arena;
  unsigned cases = 0;
  std::string Path(const char* leaf) const { return arena + "/" + leaf; }
  void Directory(const char* leaf, mode_t mode) {
    stage = leaf;
    const auto path = Path(leaf);
    const auto result = RunAs(service, limit, [&]() {
      ::umask(0);
      Outcome value; errno = 0; value.rc = ::mkdir(path.c_str(), mode); value.error = value.rc < 0 ? errno : 0; return value;
    });
    Record(leaf, "service", "mkdir", result); Require(result.rc == 0);
  }
  void ControlAcl(const char* leaf, Control control) {
    stage = leaf;
    const auto path = Path(leaf);
    const auto result = RunAs(service, limit, [&]() {
      Outcome value;
      OwnedFd fd {::open(path.c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)};
      if (fd.value < 0) { value.error = errno; return value; }
      errno = 0; value.rc = SetControl(fd.value, control, attacker.uid); value.error = value.rc < 0 ? errno : 0; return value;
    });
    Record(leaf, "service", "set-fixture-acl", result); Require(result.rc == 0);
  }
  Observation Query(const char* leaf) {
    stage = leaf;
    const auto path = Path(leaf);
    const auto result = RunAs(service, limit, [&]() {
      Outcome value;
      OwnedFd fd {::open(path.c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)};
      if (fd.value < 0) { value.error = errno; return value; }
      value.rc = 0; value.observation = ObserveAcl(fd.value); return value;
    });
    Record(leaf, "service", "observe", result); Require(result.rc == 0 && result.observation.stat_rc == 0);
    return result.observation;
  }
  void Attack(const char* leaf, const char* attempt, bool permitted) {
    stage = attempt;
    const auto path = Path(leaf) + "/" + attempt;
    const auto result = RunAs(attacker, limit, [&]() {
      Outcome value; errno = 0;
      OwnedFd fd {::open(path.c_str(), O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600)};
      if (fd.value < 0) { value.error = errno; return value; }
      const unsigned char marker = 'S';
      errno = 0; const auto count = ::write(fd.value, &marker, 1);
      value.rc = count == 1 ? 0 : -1; value.error = value.rc < 0 ? errno : 0; return value;
    });
    Record(attempt, "attacker", "create-marker", result);
    Require(permitted ? result.rc == 0 : result.rc == -1 && (result.error == EACCES || result.error == EPERM));
    ++cases;
  }
};
int Proof(int argc, char** argv) {
  ::signal(SIGPIPE, SIG_IGN);
  Require(argc == 3 && ::getuid() == 0 && ::geteuid() == 0);
  Require(Environment("GITHUB_ACTIONS", "true") && Environment("RUNNER_ENVIRONMENT", "github-hosted") &&
      Environment("DSS_ACL_CONTRACT_PROOF", "1") && Environment("SUDO_USER", "runner"));
  const auto service_uid = Number(argv[1]), service_gid = Number(argv[2]);
  Require(service_uid > 0 && service_uid <= std::numeric_limits<uid_t>::max() &&
      service_gid > 0 && service_gid <= std::numeric_limits<gid_t>::max());
  Require(Number(std::getenv("SUDO_UID")) == service_uid && Number(std::getenv("SUDO_GID")) == service_gid);
  const auto* service_entry = ::getpwuid(static_cast<uid_t>(service_uid));
  Require(service_entry && std::strcmp(service_entry->pw_name, "runner") == 0 && service_entry->pw_gid == service_gid);
  const Account service {static_cast<uid_t>(service_uid), static_cast<gid_t>(service_gid)};
  const auto* attacker_entry = ::getpwnam("nobody");
  Require(attacker_entry && attacker_entry->pw_uid != 0 && attacker_entry->pw_gid != 0 && attacker_entry->pw_uid != service.uid);
  const Account attacker {attacker_entry->pw_uid, attacker_entry->pw_gid};
  struct rlimit descriptors {};
  Require(::getrlimit(RLIMIT_NOFILE, &descriptors) == 0 && descriptors.rlim_cur <= 1048576);
  char* canonical = ::realpath("/tmp", nullptr);
  Require(canonical != nullptr);
  const std::string temporary(canonical); std::free(canonical);
  struct stat parent {};
  Require(::lstat(temporary.c_str(), &parent) == 0 && S_ISDIR(parent.st_mode) && parent.st_uid == 0 &&
      ((parent.st_mode & 0022) == 0 || (parent.st_mode & S_ISVTX) != 0));
  std::string pattern = temporary + "/dss-acl-contract-XXXXXX";
  Require(::mkdtemp(pattern.data()) != nullptr);
  Require(::chown(pattern.c_str(), service.uid, service.gid) == 0 && ::chmod(pattern.c_str(), 0755) == 0);
  Harness h {service, attacker, descriptors.rlim_cur, pattern};
  std::cout << "{\"kind\":\"dss.acl-contract.start\",\"platform\":\"" << Platform()
      << "\",\"distinctOrdinaryUsers\":true,\"accountsChanged\":false,\"admissionEvaluated\":false}" << std::endl;
  h.Directory("fresh", 0700); h.Query("fresh"); h.Attack("fresh", "protected-denial", false);
  h.Directory("mode-open", 0777); h.Query("mode-open"); h.Attack("mode-open", "mode-positive", true);
  h.Directory("empty-request", 0700); h.ControlAcl("empty-request", Control::Empty);
  h.Query("empty-request"); h.Attack("empty-request", "empty-control-denial", false);
#if defined(__linux__)
  h.Directory("named", 0700); h.ControlAcl("named", Control::MaskZero);
  const auto restricted = h.Query("named"); Require(restricted.acl_rc == 0 && restricted.acl_entries == 5 && (restricted.mode & 0077) == 0);
  h.Attack("named", "mask-zero-denial", false);
  h.ControlAcl("named", Control::MaskOpen);
  const auto opened = h.Query("named"); Require(opened.acl_rc == 0 && opened.acl_entries == 5 && (opened.mode & 0070) == 0070);
  h.Attack("named", "mask-open-positive", true);
  h.Directory("inherit-parent", 0711); h.ControlAcl("inherit-parent", Control::InheritedAllow);
  Require(h.Query("inherit-parent").default_entries == 5);
  h.Directory("inherit-parent/restricted", 0700);
  const auto child = h.Query("inherit-parent/restricted"); Require(child.acl_entries == 5 && (child.mode & 0077) == 0);
  h.Attack("inherit-parent/restricted", "inherited-mask-denial", false);
  h.Directory("inherit-parent/open", 0770);
  Require(h.Query("inherit-parent/open").acl_entries == 5);
  h.Attack("inherit-parent/open", "inherited-open-positive", true);
#elif defined(__APPLE__)
  h.Directory("named", 0700); h.ControlAcl("named", Control::NamedAllow);
  const auto allowed = h.Query("named"); Require(allowed.acl_rc == 0 && allowed.acl_entries >= 1 && allowed.mode == 0700);
  h.Attack("named", "extended-allow-positive", true);
  h.Directory("named-deny", 0777); h.ControlAcl("named-deny", Control::NamedDeny);
  const auto denied = h.Query("named-deny"); Require(denied.acl_rc == 0 && denied.acl_entries >= 1 && denied.mode == 0777);
  h.Attack("named-deny", "extended-deny-control", false);
  h.Directory("inherit-parent", 0711); h.ControlAcl("inherit-parent", Control::InheritedAllow);
  h.Query("inherit-parent"); h.Directory("inherit-parent/restricted", 0700);
  const auto child = h.Query("inherit-parent/restricted"); Require(child.acl_rc == 0 && child.acl_entries >= 1 && child.mode == 0700);
  h.Attack("inherit-parent/restricted", "inherited-extended-positive", true);
#else
#error "The ACL contract proof is POSIX Linux/macOS only"
#endif
  stage = "invalid-descriptor";
  const auto invalid = RunAs(service, h.limit, []() { Outcome value; value.rc = 0; value.observation = ObserveAcl(-1); return value; });
  Record("invalid-descriptor", "service", "observe-invalid", invalid);
  Require(invalid.observation.stat_rc == -1 && invalid.observation.stat_error == EBADF &&
      invalid.observation.acl_rc == -1 && invalid.observation.acl_error == EBADF);
  std::cout << "{\"kind\":\"dss.acl-contract.summary\",\"success\":true,\"actorControls\":" << h.cases
      << ",\"invalidDescriptorChecked\":true,\"admissionEvaluated\":false,\"fixturesRetained\":true}" << std::endl;
  return 0;
}
}  // namespace
}  // namespace dss::proof
int main(int argc, char** argv) {
  try { return dss::proof::Proof(argc, argv); }
  catch (...) {
    std::cout << "{\"kind\":\"dss.acl-contract.summary\",\"success\":false,\"stage\":\""
        << dss::proof::Label(dss::proof::stage) << "\",\"admissionEvaluated\":false}" << std::endl;
    return 1;
  }
}
