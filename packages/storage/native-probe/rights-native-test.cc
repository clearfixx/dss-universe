/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Rights Verification
 * 📄 File: packages/storage/native-probe/rights-native-test.cc
 * 🎯 Purpose: Exercises native model boundaries and real context/error controls.
 * 🧠 Responsibilities: Separates synthetic policy cases from genuine OS observations.
 * 🏗️ Architecture: Test executable outside the addon and public storage package.
 * ⚠️ Important: Throws on mismatched evidence; never promotes an admitted root.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "src/native-object.h"
#include "src/rights-model.h"
#include <iostream>
#include <stdexcept>
#include <cstring>
#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#else
#include "rights-test-posix.h"
#endif
using dss::storage::probe::CaptureRightsContext;
using dss::storage::probe::ChangeMetadata;
using dss::storage::probe::ChangeNamespace;
using dss::storage::probe::DeleteChild;
using dss::storage::probe::DirectoryRole;
using dss::storage::probe::EvaluateDirectoryRights;
using dss::storage::probe::InspectRoleRights;
using dss::storage::probe::Kind;
using dss::storage::probe::NativeChain;
using dss::storage::probe::NativeError;
using dss::storage::probe::NativeObject;
using dss::storage::probe::OwnerClass;
using dss::storage::probe::ParseDirectoryRole;
using dss::storage::probe::ReadContent;
using dss::storage::probe::ReadDirectoryRights;
using dss::storage::probe::RightsFacts;
using dss::storage::probe::RightsState;
namespace {
void Require(bool condition) { if (!condition) throw std::runtime_error("rights test failed"); }
void Models() {
  RightsFacts good;
  good.owner = OwnerClass::Service;
  good.grants = good.inheritance = good.service_access = good.acl_metadata = {RightsState::Satisfied, "synthetic", 0};
  for (auto role : {DirectoryRole::Ancestor, DirectoryRole::SharedNamespace, DirectoryRole::ProtectedParent, DirectoryRole::PrivateControl}) {
    const auto evidence = EvaluateDirectoryRights(good, role, nullptr, nullptr);
    Require(evidence.owner.state == RightsState::Satisfied && evidence.grant_model.state == RightsState::Satisfied);
    auto foreign = good; foreign.owner = OwnerClass::Other;
    Require(EvaluateDirectoryRights(foreign, role, nullptr, nullptr).owner.state == RightsState::Violated);
    auto unknown = good; unknown.grants.state = RightsState::Unavailable;
    Require(EvaluateDirectoryRights(unknown, role, nullptr, nullptr).grant_model.state == RightsState::Unavailable);
  }
  auto writable = good; writable.current_risks = ChangeNamespace;
  Require(EvaluateDirectoryRights(writable, DirectoryRole::SharedNamespace, nullptr, nullptr).grant_model.state == RightsState::Satisfied);
  Require(EvaluateDirectoryRights(writable, DirectoryRole::ProtectedParent, nullptr, nullptr).grant_model.state == RightsState::Violated);
  auto metadata = good; metadata.current_risks = ChangeMetadata;
  Require(EvaluateDirectoryRights(metadata, DirectoryRole::SharedNamespace, nullptr, nullptr).grant_model.state == RightsState::Violated);
  auto readable = good; readable.current_risks = ReadContent;
  Require(EvaluateDirectoryRights(readable, DirectoryRole::PrivateControl, nullptr, nullptr).grant_model.state == RightsState::Violated);
  Require(EvaluateDirectoryRights(readable, DirectoryRole::ProtectedParent, nullptr, nullptr).grant_model.state == RightsState::Satisfied);
  auto inherited = good; inherited.inherited_risks = ChangeNamespace;
  Require(EvaluateDirectoryRights(inherited, DirectoryRole::ProtectedParent, nullptr, nullptr).inheritance_model.state == RightsState::Violated);
  auto parent = good; parent.current_risks = DeleteChild;
  Require(EvaluateDirectoryRights(good, DirectoryRole::ProtectedParent, &parent, nullptr).parent_model.state == RightsState::Violated);
  parent.posix = parent.sticky = true;
  Require(EvaluateDirectoryRights(good, DirectoryRole::ProtectedParent, &parent, nullptr).parent_model.state == RightsState::Satisfied);
  parent.owner = OwnerClass::Other;
  Require(EvaluateDirectoryRights(good, DirectoryRole::ProtectedParent, &parent, nullptr).parent_model.state == RightsState::Violated);
  bool rejected = false;
  try { ParseDirectoryRole(nullptr); } catch (const NativeError&) { rejected = true; }
  Require(rejected);
}
void OsControls() {
  auto context = CaptureRightsContext();
  Require(context->MatchesCurrent());
  NativeChain oversized(std::vector<std::shared_ptr<NativeObject>>(1025), true);
  bool bounded = false;
  try { InspectRoleRights(oversized, DirectoryRole::Ancestor, *context); }
  catch (const NativeError& error) { bounded = std::strcmp(error.code, "ERR_STORAGE_NATIVE_RIGHTS_LIMIT") == 0; }
  Require(bounded);
#if defined(_WIN32)
  NativeObject invalid(0, Kind::Root); // -1 is a valid current-process pseudo-handle on Windows.
#else
  NativeObject invalid(-1, Kind::Root);
#endif
  const auto unknown = ReadDirectoryRights(invalid, DirectoryRole::PrivateControl, *context);
  Require(unknown.acl_metadata.state != RightsState::Satisfied && unknown.acl_metadata.os_code != 0);
#if defined(_WIN32)
  Require(ImpersonateSelf(SecurityImpersonation) != FALSE);
  struct Revert { ~Revert() { RevertToSelf(); } } revert;
  bool rejected = false;
  try { CaptureRightsContext(); }
  catch (const NativeError& error) { rejected = std::strcmp(error.code, "ERR_STORAGE_NATIVE_RIGHTS_CONTEXT") == 0; }
  Require(rejected);
#else
  PosixDecoderControls();
#endif
}
}
int main(int argc, char** argv) {
  (void)argv;
  try {
#if !defined(_WIN32)
    if (argc == 5 && std::strcmp(argv[1], "fixture") == 0) {
      PreparePosixRightsFixture(argv[2], argv[3], argv[4]);
      std::cout << "{\"fixturePrepared\":true}\n"; return 0;
    }
#endif
    if (argc != 1) throw std::runtime_error("invalid test arguments");
    Models(); OsControls();
    std::cout << "{\"modelControls\":true,\"osErrorControl\":true,\"contextControls\":true}\n";
    return 0;
  } catch (...) { std::cerr << "Native rights verification failed.\n"; return 1; }
}
