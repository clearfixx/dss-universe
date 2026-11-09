/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/qualification-proof.cc
 * 🎯 Purpose: Exercises held-object queries and actual worker credential consistency.
 * 🧠 Responsibilities: Owns resources, compares private identities and emits fixed facts.
 * 🏗️ Architecture: Test-only executable reusing accepted capture/context readers.
 * ⚠️ Important: No raw identities, paths, mappings or admission are serialized.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include "qualification-proof.h"
#include "../../../../packages/storage/native-probe/src/rights-model.h"
#include <cstring>
#include <cstdlib>
#include <future>
#include <iostream>
#include <stdexcept>

using dss::storage::probe::CaptureRootChain;
using dss::storage::probe::CaptureRightsContext;
using dss::storage::probe::IdentityObservation;
using dss::storage::probe::Kind;
using dss::storage::probe::NativeError;
using dss::storage::probe::NativeObject;
using dss::storage::probe::ReadTopology;
using dss::storage::probe::TopologyState;
using dss::storage::qualification_proof::DecoderControls;
using dss::storage::qualification_proof::Evidence;
using dss::storage::qualification_proof::Fact;
using dss::storage::qualification_proof::ObservePlatform;
using dss::storage::qualification_proof::OrdinaryContext;
using dss::storage::qualification_proof::State;
namespace {
void Require(bool value) { if (!value) throw std::runtime_error("qualification proof assertion"); }
const char* StateName(State value) {
  switch (value) { case State::Present: return "present"; case State::Unavailable: return "unavailable";
    case State::Unsupported: return "unsupported"; }
  throw std::runtime_error("unknown state");
}
void PrintFact(const char* name, const Fact& fact) {
  Require(fact.value >= -1 && fact.value <= 1);
  Require(fact.state == State::Present ? fact.value != -1 && fact.error == 0 : fact.value == -1);
  std::cout << ",\"" << name << "\":{\"state\":\"" << StateName(fact.state)
      << "\",\"value\":";
  if (fact.value == -1) std::cout << "null"; else std::cout << (fact.value ? "true" : "false");
  std::cout << ",\"osCode\":" << fact.error << '}';
}
void Relation(const char* name, const IdentityObservation& left, const IdentityObservation& right) {
  std::cout << ",\"" << name << "\":";
  if (left.state != TopologyState::Present || right.state != TopologyState::Present ||
      left.bytes.empty() || right.bytes.empty() || std::strcmp(left.kind, right.kind)) std::cout << "null";
  else std::cout << (left.bytes == right.bytes ? "true" : "false");
}
void Units() {
  const bool decoder = DecoderControls();
#if defined(_WIN32)
  NativeObject invalid(0, Kind::Root);
#else
  NativeObject invalid(-1, Kind::Root);
#endif
  const auto facts = ObservePlatform(invalid);
  Require(facts.read_only.state == State::Unavailable && facts.read_only.error != 0);
  auto context = CaptureRightsContext();
  Require(context->MatchesCurrent());
  auto worker = std::async(std::launch::async, [context] { return context->MatchesCurrent(); });
  Require(worker.get());
  std::cout << "{\"kind\":\"qualification-unit-controls\",\"decoderNegatives\":" << (decoder ? "true" : "false") << ',' <<
      "\"genuineOsError\":true,\"workerContext\":true,\"admitted\":false}\n";
}
void Inspect(const char* path, const char* other, bool ordinary, bool hold) {
  if (ordinary) Require(OrdinaryContext());
  auto context = CaptureRightsContext();
  auto chain = CaptureRootChain(path);
  auto comparison = CaptureRootChain(other);
  if (hold) {
    std::cout << "{\"kind\":\"held-ready\"}\n" << std::flush;
    std::string command;
    Require(static_cast<bool>(std::getline(std::cin, command)) && command == "go");
  }
  auto worker = std::async(std::launch::async, [context, chain, comparison, hold] {
    const auto object = chain->components().back(), right = comparison->components().back();
    Require(context->MatchesCurrent());
    const auto before = ReadTopology(*object);
    const Evidence facts = ObservePlatform(*object);
    const auto after = ReadTopology(*object), sibling = ReadTopology(*right);
    Require(context->MatchesCurrent());
    Require(before.object.state == TopologyState::Present && after.object.state == TopologyState::Present &&
        before.object.bytes == after.object.bytes && std::strcmp(before.object.kind, after.object.kind) == 0);
    std::cout << "{\"kind\":\"qualification-evidence\",\"admitted\":false,\"filesystemQualified\":false,"
        "\"atomic\":false,\"credentialContextStable\":true,\"linuxBuildFeatures\":" << facts.linux_build_features <<
        ",\"family\":\"" << after.filesystem_family << '"';
    PrintFact("remoteDevice", facts.remote_device); PrintFact("removableMedia", facts.removable_media);
    PrintFact("ownershipIgnored", facts.ownership_ignored); PrintFact("snapshot", facts.snapshot);
    PrintFact("readOnly", facts.read_only); PrintFact("idmapped", facts.idmapped);
    PrintFact("mountBound", facts.mount_bound);
    PrintFact("namespaceContextStable", facts.namespace_context);
    Relation("sameObject", after.object, sibling.object); Relation("sameDevice", after.device, sibling.device);
    Relation("sameFilesystem", after.filesystem, sibling.filesystem); Relation("sameMount", after.mount, sibling.mount);
    std::cout << ",\"heldAcrossBarrier\":" << (hold ? "true" : "false") <<
        ",\"hostIdentityQualified\":false,\"operationQualified\":false}\n";
  });
  chain.reset(); comparison.reset(); // Worker retains both complete chains after caller release.
  worker.get();
}
}
int main(int argc, char** argv) {
  try {
    if (argc == 2 && std::strcmp(argv[1], "--unit") == 0) { Units(); return 0; }
    if (argc == 4 && (std::strcmp(argv[1], "--inspect") == 0 || std::strcmp(argv[1], "--actor") == 0 ||
        std::strcmp(argv[1], "--hold") == 0)) {
      const bool ordinary = std::strcmp(argv[1], "--inspect") != 0;
      if (ordinary) {
        for (const auto& variable : {std::pair {"GITHUB_ACTIONS", "true"},
            std::pair {"RUNNER_ENVIRONMENT", "github-hosted"}, std::pair {"DSS_RIGHTS_ACTOR_PROOF", "1"}}) {
          const auto value = std::getenv(variable.first);
          Require(value && std::strcmp(value, variable.second) == 0);
        }
      }
      Inspect(argv[2], argv[3], ordinary, std::strcmp(argv[1], "--hold") == 0); return 0;
    }
    throw std::runtime_error("invalid arguments");
  } catch (const NativeError& error) {
    std::cerr << "{\"kind\":\"qualification-failure\",\"osCode\":" << error.os_code << "}\n";
  } catch (...) { std::cerr << "{\"kind\":\"qualification-failure\",\"osCode\":0}\n"; }
  return 1;
}
