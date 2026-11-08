/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/src/addon.cc
 *
 * 🎯 Purpose:
 * Bridges typed opaque resources to asynchronous Node-API operations.
 *
 * 🧠 Responsibilities:
 * • Validates JS callers before accessing wrapped native state.
 * • Pins resources until in-flight work settles and finalizes unused ownership.
 * • Exposes metadata without raw descriptors or private paths.
 * • Keeps R1 captured chains distinct from P1 single-object capabilities.
 *
 * 🏗️ Architecture:
 * Experimental infrastructure bridge outside the public package exports.
 *
 * ⚠️ Important:
 * No production containment or authorization guarantee is provided by P1.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#include <node_api.h>
#include "native-object.h"
#include "rights-model.h"
#include <new>
#include <utility>
#include <cstring>

namespace dss::storage::probe {
namespace {
const napi_type_tag kCapabilityTag {0x44535353544f5241ULL, 0x4745503143415031ULL};
struct Envelope { std::shared_ptr<NativeObject> resource; std::shared_ptr<NativeChain> chain; };
enum class Operation { OpenRoot, OpenFile, Inspect, CaptureRootChain, InspectChain, CaptureSecurityChain, InspectSecurityChain,
  InspectTopologyChain, CompareTopologyChains, InspectRoleRights };
struct Work {
  Operation operation;
  napi_async_work work = nullptr;
  napi_deferred deferred = nullptr;
  std::string text;
  std::shared_ptr<NativeObject> resource;
  std::shared_ptr<NativeObject> result;
  std::shared_ptr<NativeChain> chain;
  std::uint32_t chain_components = 0;
  std::vector<SecurityEvidence> security;
  std::shared_ptr<NativeChain> other_chain;
  std::vector<TopologyEvidence> topology, other_topology;
  DirectoryRole role = DirectoryRole::Ancestor;
  std::shared_ptr<RightsContext> rights_context;
  std::vector<RoleRightsEvidence> rights;
  Metadata metadata {Kind::Root, 0, 0};
  const char* error = nullptr;
  std::uint32_t os_code = 0;
  explicit Work(Operation value) : operation(value) {}
};

bool Check(napi_env env, napi_status status) {
  if (status == napi_ok) return true;
  napi_throw_error(env, "ERR_STORAGE_NATIVE_BINDING", "Storage prototype binding failed.");
  return false;
}
napi_value ErrorValue(napi_env env, const char* code, std::uint32_t os_code) {
  napi_value name, message, error, os;
  if (!Check(env, napi_create_string_utf8(env, code, NAPI_AUTO_LENGTH, &name)) ||
      !Check(env, napi_create_string_utf8(env, "Storage native probe operation failed.", NAPI_AUTO_LENGTH, &message)) ||
      !Check(env, napi_create_error(env, name, message, &error)) ||
      !Check(env, napi_create_uint32(env, os_code, &os)) ||
      !Check(env, napi_set_named_property(env, error, "osCode", os))) return nullptr;
  return error;
}
void Finalize(napi_env, void* data, void*) { delete static_cast<Envelope*>(data); }
napi_value Wrap(napi_env env, const std::shared_ptr<NativeObject>& resource,
                const std::shared_ptr<NativeChain>& chain = {}) {
  std::unique_ptr<Envelope> slot(new (std::nothrow) Envelope {resource, chain});
  if (!slot) { napi_throw_error(env, "ERR_STORAGE_NATIVE_MEMORY", "Native resource allocation failed."); return nullptr; }
  napi_value object;
  if (!Check(env, napi_create_object(env, &object)) ||
      !Check(env, napi_type_tag_object(env, object, &kCapabilityTag)) ||
      !Check(env, napi_wrap(env, object, slot.get(), Finalize, nullptr, nullptr))) return nullptr;
  slot.release();
  return object;
}
Envelope* Unwrap(napi_env env, napi_value object) {
  napi_valuetype type;
  napi_value null_value;
  bool is_null = false;
  if (!Check(env, napi_typeof(env, object, &type)) ||
      !Check(env, napi_get_null(env, &null_value)) ||
      !Check(env, napi_strict_equals(env, object, null_value, &is_null))) return nullptr;
  if (type != napi_object || is_null) {
    napi_throw_type_error(env, "ERR_STORAGE_NATIVE_CAPABILITY", "Expected an owned native probe capability.");
    return nullptr;
  }
  bool matches = false;
  void* raw = nullptr;
  if (napi_check_object_type_tag(env, object, &kCapabilityTag, &matches) != napi_ok ||
      !matches || napi_unwrap(env, object, &raw) != napi_ok || !raw) {
    napi_throw_type_error(env, "ERR_STORAGE_NATIVE_CAPABILITY", "Expected an owned native probe capability.");
    return nullptr;
  }
  return static_cast<Envelope*>(raw);
}
bool String(napi_env env, napi_value value, std::string& result) {
  napi_valuetype type;
  if (!Check(env, napi_typeof(env, value, &type))) return false;
  if (type != napi_string) {
    napi_throw_type_error(env, "ERR_STORAGE_NATIVE_STRING", "Expected a string."); return false;
  }
  std::size_t length = 0;
  if (!Check(env, napi_get_value_string_utf8(env, value, nullptr, 0, &length))) return false;
  result.resize(length + 1);
  std::size_t written = 0;
  if (!Check(env, napi_get_value_string_utf8(env, value, result.data(), result.size(), &written))) return false;
  result.resize(written);
  return true;
}
bool Arguments(napi_env env, napi_callback_info info, std::size_t wanted, napi_value* args) {
  std::size_t count = wanted + 1;
  if (!Check(env, napi_get_cb_info(env, info, &count, args, nullptr, nullptr))) return false;
  if (count != wanted) {
    napi_throw_type_error(env, "ERR_STORAGE_NATIVE_ARGUMENTS", "Unexpected argument count."); return false;
  }
  return true;
}
std::shared_ptr<NativeObject> Live(napi_env env, napi_value object) {
  Envelope* slot = Unwrap(env, object);
  if (!slot) return {};
  if (slot->chain) {
    napi_throw_type_error(env, "ERR_STORAGE_NATIVE_CAPABILITY_KIND", "Expected a single-object capability.");
    return {};
  }
  if (!slot->resource) napi_throw_error(env, "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED", "Native probe capability is closed.");
  return slot->resource;
}
std::shared_ptr<NativeChain> LiveChain(napi_env env, napi_value object) {
  Envelope* slot = Unwrap(env, object);
  if (!slot) return {};
  if (slot->resource) {
    napi_throw_type_error(env, "ERR_STORAGE_NATIVE_CAPABILITY_KIND", "Expected a captured-chain capability.");
    return {};
  }
  if (!slot->chain) napi_throw_error(env, "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED", "Native chain capability is closed.");
  return slot->chain;
}
napi_value ChainValue(napi_env env, std::uint32_t components) {
  napi_value result, kind, count, admitted;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_string_utf8(env, "captured-chain", NAPI_AUTO_LENGTH, &kind)) ||
      !Check(env, napi_create_uint32(env, components, &count)) ||
      !Check(env, napi_get_boolean(env, false, &admitted)) ||
      !Check(env, napi_set_named_property(env, result, "kind", kind)) ||
      !Check(env, napi_set_named_property(env, result, "components", count)) ||
      !Check(env, napi_set_named_property(env, result, "admitted", admitted))) return nullptr;
  return result;
}
napi_value TextValue(napi_env env, const char* text) {
  napi_value value;
  return Check(env, napi_create_string_utf8(env, text, NAPI_AUTO_LENGTH, &value)) ? value : nullptr;
}
napi_value BooleanValue(napi_env env, bool known, bool observed) {
  napi_value value;
  return Check(env, known ? napi_get_boolean(env, observed, &value) : napi_get_null(env, &value)) ? value : nullptr;
}
bool Property(napi_env env, napi_value object, const char* name, napi_value value) {
  return value != nullptr && Check(env, napi_set_named_property(env, object, name, value));
}
napi_value AclValue(napi_env env, const AclEvidence& acl) {
  const char* state = "unavailable";
  switch (acl.state) {
    case EvidenceState::Present: state = "present"; break;
    case EvidenceState::VerifiedAbsent: state = "verified-absent"; break;
    case EvidenceState::Unavailable: break;
    case EvidenceState::Unsupported: state = "unsupported"; break;
  }
  napi_value result, count, code;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, acl.entries_known ? napi_create_uint32(env, acl.entries, &count) : napi_get_null(env, &count)) ||
      !Check(env, napi_create_uint32(env, acl.os_code, &code)) ||
      !Property(env, result, "state", TextValue(env, state)) ||
      !Property(env, result, "format", TextValue(env, acl.format)) ||
      !Property(env, result, "shape", TextValue(env, acl.shape)) ||
      !Property(env, result, "entries", count) ||
      !Property(env, result, "osCode", code) ||
      !Property(env, result, "unknownEntryTypes", BooleanValue(env, acl.entries_known, acl.unknown_entry_types)) ||
      !Property(env, result, "inheritanceObserved", BooleanValue(env, acl.entries_known, acl.inheritance_observed))) return nullptr;
  return result;
}
napi_value SecurityValue(napi_env env, const SecurityEvidence& facts) {
  napi_value result, mode, default_acl;
  if (!Check(env, napi_create_object(env, &result))) return nullptr;
  if (facts.mode_known) {
    if (!Check(env, napi_create_object(env, &mode)) ||
        !Property(env, mode, "groupWrite", BooleanValue(env, true, facts.group_write)) ||
        !Property(env, mode, "otherWrite", BooleanValue(env, true, facts.other_write)) ||
        !Property(env, mode, "sticky", BooleanValue(env, true, facts.sticky))) return nullptr;
  } else if (!Check(env, napi_get_null(env, &mode))) return nullptr;
  if (facts.default_acl_applicable) default_acl = AclValue(env, facts.default_acl);
  else if (!Check(env, napi_get_null(env, &default_acl))) return nullptr;
  if (!Property(env, result, "ownerMatchesProcess", BooleanValue(env, facts.owner_match_known, facts.owner_matches_process)) ||
      !Property(env, result, "ownerIsSystem", BooleanValue(env, facts.owner_known, facts.owner_is_system)) ||
      !Property(env, result, "mode", mode) ||
      !Property(env, result, "acl", AclValue(env, facts.acl)) ||
      !Property(env, result, "defaultAcl", default_acl)) return nullptr;
  return result;
}
napi_value SecurityChainValue(napi_env env, const std::vector<SecurityEvidence>& facts) {
  napi_value result, components;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_array_with_length(env, facts.size(), &components))) return nullptr;
  for (std::uint32_t index = 0; index < facts.size(); ++index) {
    napi_value value = SecurityValue(env, facts[index]);
    if (value == nullptr || !Check(env, napi_set_element(env, components, index, value))) return nullptr;
  }
  if (!Property(env, result, "kind", TextValue(env, "security-evidence")) ||
      !Property(env, result, "admitted", BooleanValue(env, true, false)) ||
      !Property(env, result, "effectiveAccessEvaluated", BooleanValue(env, true, false)) ||
      !Property(env, result, "components", components)) return nullptr;
  return result;
}
napi_value ObservationValue(napi_env env, const IdentityObservation& facts) {
  napi_value result, code;
  const char* state = facts.state == TopologyState::Present ? "present" :
      facts.state == TopologyState::Unsupported ? "unsupported" : "unavailable";
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_uint32(env, facts.os_code, &code)) ||
      !Property(env, result, "state", TextValue(env, state)) ||
      !Property(env, result, "kind", TextValue(env, facts.kind)) ||
      !Property(env, result, "osCode", code)) return nullptr;
  return result;
}
napi_value RelationValue(napi_env env, const IdentityObservation* left, const IdentityObservation& right) {
  const bool known = left != nullptr && left->state == TopologyState::Present && right.state == TopologyState::Present &&
      std::strcmp(left->kind, right.kind) == 0 && !left->bytes.empty() && !right.bytes.empty();
  return BooleanValue(env, known, known && left->bytes == right.bytes);
}
napi_value TopologyValue(napi_env env, const TopologyEvidence& facts, const TopologyEvidence* previous) {
  napi_value result, flags, code;
  if (!Check(env, napi_create_object(env, &result)) || !Check(env, napi_create_object(env, &flags)) ||
      !Check(env, napi_create_uint32(env, facts.flags_os_code, &code)) ||
      !Property(env, flags, "state", TextValue(env, facts.flags_known ? "present" : "unavailable")) ||
      !Property(env, flags, "osCode", code) ||
      !Property(env, flags, "readOnly", BooleanValue(env, facts.flags_known, facts.read_only)) ||
      !Property(env, flags, "local", BooleanValue(env, facts.local_known, facts.local)) ||
      !Property(env, flags, "persistentAcl", BooleanValue(env, facts.persistent_acl_known, facts.persistent_acl)) ||
      !Property(env, result, "object", ObservationValue(env, facts.object)) ||
      !Property(env, result, "device", ObservationValue(env, facts.device)) ||
      !Property(env, result, "filesystem", ObservationValue(env, facts.filesystem)) ||
      !Property(env, result, "mount", ObservationValue(env, facts.mount)) ||
      !Property(env, result, "filesystemFamily", TextValue(env, facts.filesystem_family)) ||
      !Property(env, result, "volumeFlags", flags) ||
      !Property(env, result, "sameObjectAsPrevious", RelationValue(env, previous ? &previous->object : nullptr, facts.object)) ||
      !Property(env, result, "sameDeviceAsPrevious", RelationValue(env, previous ? &previous->device : nullptr, facts.device)) ||
      !Property(env, result, "sameFilesystemAsPrevious", RelationValue(env, previous ? &previous->filesystem : nullptr, facts.filesystem)) ||
      !Property(env, result, "sameMountAsPrevious", RelationValue(env, previous ? &previous->mount : nullptr, facts.mount))) return nullptr;
  return result;
}
napi_value TopologyChainValue(napi_env env, const std::vector<TopologyEvidence>& facts) {
  napi_value result, components;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_array_with_length(env, facts.size(), &components))) return nullptr;
  for (std::uint32_t index = 0; index < facts.size(); ++index) {
    napi_value value = TopologyValue(env, facts[index], index ? &facts[index - 1] : nullptr);
    if (!value || !Check(env, napi_set_element(env, components, index, value))) return nullptr;
  }
  if (!Property(env, result, "kind", TextValue(env, "topology-evidence")) ||
      !Property(env, result, "admitted", BooleanValue(env, true, false)) ||
      !Property(env, result, "filesystemQualified", BooleanValue(env, true, false)) ||
      !Property(env, result, "components", components)) return nullptr;
  return result;
}
napi_value TopologyComparisonValue(napi_env env, const TopologyEvidence& left, const TopologyEvidence& right) {
  napi_value result;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Property(env, result, "kind", TextValue(env, "topology-comparison")) ||
      !Property(env, result, "admitted", BooleanValue(env, true, false)) ||
      !Property(env, result, "sameObject", RelationValue(env, &left.object, right.object)) ||
      !Property(env, result, "sameDevice", RelationValue(env, &left.device, right.device)) ||
      !Property(env, result, "sameFilesystem", RelationValue(env, &left.filesystem, right.filesystem)) ||
      !Property(env, result, "sameMount", RelationValue(env, &left.mount, right.mount))) return nullptr;
  return result;
}
napi_value MetadataValue(napi_env env, const Metadata& metadata) {
  napi_value result, kind, size, links;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_string_utf8(env, metadata.kind == Kind::Root ? "root" : "file", NAPI_AUTO_LENGTH, &kind)) ||
      !Check(env, napi_create_bigint_uint64(env, metadata.size, &size)) ||
      !Check(env, napi_create_uint32(env, metadata.links, &links)) ||
      !Check(env, napi_set_named_property(env, result, "kind", kind)) ||
      !Check(env, napi_set_named_property(env, result, "size", size)) ||
      !Check(env, napi_set_named_property(env, result, "links", links))) return nullptr;
  return result;
}
napi_value RightsCheckValue(napi_env env, const RightsCheck& check) {
  napi_value result, code;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_uint32(env, check.os_code, &code)) ||
      !Property(env, result, "state", TextValue(env, RightsStateName(check.state))) ||
      !Property(env, result, "reason", TextValue(env, check.reason)) ||
      !Property(env, result, "osCode", code)) return nullptr;
  return result;
}
napi_value RightsValue(napi_env env, const std::vector<RoleRightsEvidence>& facts) {
  napi_value result, components, qualifications;
  if (!Check(env, napi_create_object(env, &result)) ||
      !Check(env, napi_create_array_with_length(env, facts.size(), &components)) ||
      !Check(env, napi_create_array_with_length(env, 4, &qualifications))) return nullptr;
  const char* required[] = {"identity-domain", "filesystem-and-transition", "creation-protocol", "hostile-operations"};
  for (std::uint32_t index = 0; index < 4; ++index) {
    const auto text = TextValue(env, required[index]);
    if (!text || !Check(env, napi_set_element(env, qualifications, index, text))) return nullptr;
  }
  for (std::uint32_t index = 0; index < facts.size(); ++index) {
    const auto& item = facts[index];
    napi_value value;
    if (!Check(env, napi_create_object(env, &value)) ||
        !Property(env, value, "role", TextValue(env, DirectoryRoleName(item.role))) ||
        !Property(env, value, "ownerClass", TextValue(env, OwnerClassName(item.owner_class))) ||
        !Property(env, value, "owner", RightsCheckValue(env, item.owner)) ||
        !Property(env, value, "serviceAccess", RightsCheckValue(env, item.service_access)) ||
        !Property(env, value, "aclMetadata", RightsCheckValue(env, item.acl_metadata)) ||
        !Property(env, value, "grantModel", RightsCheckValue(env, item.grant_model)) ||
        !Property(env, value, "inheritanceModel", RightsCheckValue(env, item.inheritance_model)) ||
        !Property(env, value, "parentModel", RightsCheckValue(env, item.parent_model)) ||
        !Check(env, napi_set_element(env, components, index, value))) return nullptr;
  }
  if (!Property(env, result, "kind", TextValue(env, "role-rights-evidence")) ||
      !Property(env, result, "ruleset", TextValue(env, "directory-owner-rights-v1")) ||
      !Property(env, result, "admitted", BooleanValue(env, true, false)) ||
      !Property(env, result, "filesystemQualified", BooleanValue(env, true, false)) ||
      !Property(env, result, "atomic", BooleanValue(env, true, false)) ||
      !Property(env, result, "qualificationsRequired", qualifications) ||
      !Property(env, result, "components", components)) return nullptr;
  return result;
}
void Execute(napi_env, void* data) {
  Work& work = *static_cast<Work*>(data);
  try {
    switch (work.operation) {
      case Operation::OpenRoot: work.result = OpenRoot(work.text); break;
      case Operation::OpenFile: work.result = OpenFile(*work.resource, work.text); break;
      case Operation::Inspect: work.metadata = Inspect(*work.resource); break;
      case Operation::CaptureRootChain: work.chain = CaptureRootChain(work.text); break;
      case Operation::InspectChain: work.chain_components = InspectChain(*work.chain); break;
      case Operation::CaptureSecurityChain: work.chain = CaptureSecurityChain(work.text); break;
      case Operation::InspectSecurityChain: work.security = InspectSecurityChain(*work.chain); break;
      case Operation::InspectRoleRights: work.rights = InspectRoleRights(*work.chain, work.role, *work.rights_context); break;
        case Operation::InspectTopologyChain: work.topology = InspectTopologyChain(*work.chain); break;
        case Operation::CompareTopologyChains:
          work.topology = InspectTopologyChain(*work.chain);
          work.other_topology = InspectTopologyChain(*work.other_chain);
          break;
    }
  } catch (const NativeError& error) { work.error = error.code; work.os_code = error.os_code;
  } catch (...) { work.error = "ERR_STORAGE_NATIVE_INTERNAL"; }
}
void Reject(napi_env env, napi_deferred deferred, const char* code, std::uint32_t os_code) {
  napi_value error = nullptr;
  bool pending = false;
  if (napi_is_exception_pending(env, &pending) == napi_ok && pending)
    napi_get_and_clear_last_exception(env, &error);
  else error = ErrorValue(env, code, os_code);
  if (error) napi_reject_deferred(env, deferred, error);
}
void Complete(napi_env env, napi_status status, void* data) {
  std::unique_ptr<Work> work(static_cast<Work*>(data));
  napi_delete_async_work(env, work->work);
  if (status != napi_ok || work->error) {
    Reject(env, work->deferred, work->error ? work->error : "ERR_STORAGE_NATIVE_CANCELLED", work->os_code);
    return;
  }
  napi_value result;
  if (work->operation == Operation::Inspect) result = MetadataValue(env, work->metadata);
  else if (work->operation == Operation::InspectChain) result = ChainValue(env, work->chain_components);
  else if (work->operation == Operation::InspectSecurityChain) result = SecurityChainValue(env, work->security);
  else if (work->operation == Operation::InspectRoleRights) result = RightsValue(env, work->rights);
  else if (work->operation == Operation::InspectTopologyChain) result = TopologyChainValue(env, work->topology);
  else if (work->operation == Operation::CompareTopologyChains)
    result = TopologyComparisonValue(env, work->topology.back(), work->other_topology.back());
  else if (work->operation == Operation::CaptureRootChain || work->operation == Operation::CaptureSecurityChain)
    result = Wrap(env, {}, work->chain);
  else result = Wrap(env, work->result);
  if (!result) Reject(env, work->deferred, "ERR_STORAGE_NATIVE_BINDING", 0);
  else napi_resolve_deferred(env, work->deferred, result);
}
napi_value Queue(napi_env env, std::unique_ptr<Work> work) {
  napi_value promise, name;
  if (!Check(env, napi_create_promise(env, &work->deferred, &promise))) return nullptr;
  if (!Check(env, napi_create_string_utf8(env, "dss.storage.native.p1", NAPI_AUTO_LENGTH, &name)) ||
      !Check(env, napi_create_async_work(env, nullptr, name, Execute, Complete, work.get(), &work->work))) {
    Reject(env, work->deferred, "ERR_STORAGE_NATIVE_BINDING", 0); return promise;
  }
  if (napi_queue_async_work(env, work->work) != napi_ok) {
    napi_delete_async_work(env, work->work);
    Reject(env, work->deferred, "ERR_STORAGE_NATIVE_BINDING", 0); return promise;
  }
  work.release();
  return promise;
}
template <typename Action> napi_value Guard(napi_env env, Action action) {
  try { return action(); }
  catch (...) { napi_throw_error(env, "ERR_STORAGE_NATIVE_INTERNAL", "Native probe binding failed."); return nullptr; }
}
napi_value OpenRootCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto work = std::make_unique<Work>(Operation::OpenRoot);
    if (!String(env, args[0], work->text)) return nullptr;
    return Queue(env, std::move(work));
  });
}
napi_value OpenFileCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[3];
    if (!Arguments(env, info, 2, args)) return nullptr;
    auto resource = Live(env, args[0]);
    if (!resource) return nullptr;
    if (resource->kind() != Kind::Root) {
      napi_throw_type_error(env, "ERR_STORAGE_NATIVE_CAPABILITY_KIND", "Expected a root capability."); return nullptr;
    }
    auto work = std::make_unique<Work>(Operation::OpenFile);
    work->resource = std::move(resource);
    if (!String(env, args[1], work->text)) return nullptr;
    return Queue(env, std::move(work));
  });
}
napi_value InspectCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto resource = Live(env, args[0]);
    if (!resource) return nullptr;
    auto work = std::make_unique<Work>(Operation::Inspect);
    work->resource = std::move(resource);
    return Queue(env, std::move(work));
  });
}
napi_value CaptureRootChainCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto work = std::make_unique<Work>(Operation::CaptureRootChain);
    if (!String(env, args[0], work->text)) return nullptr;
    return Queue(env, std::move(work));
  });
}
napi_value InspectChainCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto chain = LiveChain(env, args[0]);
    if (!chain) return nullptr;
    auto work = std::make_unique<Work>(Operation::InspectChain);
    work->chain = std::move(chain);
    return Queue(env, std::move(work));
  });
}
napi_value CaptureSecurityChainCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto work = std::make_unique<Work>(Operation::CaptureSecurityChain);
    if (!String(env, args[0], work->text)) return nullptr;
    return Queue(env, std::move(work));
  });
}
napi_value InspectSecurityChainCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto chain = LiveChain(env, args[0]);
    if (!chain) return nullptr;
    if (!chain->security_read()) {
      napi_throw_type_error(env, "ERR_STORAGE_NATIVE_SECURITY_CAPABILITY", "Expected a security-readable chain.");
      return nullptr;
    }
    auto work = std::make_unique<Work>(Operation::InspectSecurityChain);
    work->chain = std::move(chain);
    return Queue(env, std::move(work));
  });
}
napi_value InspectTopologyChainCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[2];
    if (!Arguments(env, info, 1, args)) return nullptr;
    auto chain = LiveChain(env, args[0]);
    if (!chain) return nullptr;
    auto work = std::make_unique<Work>(Operation::InspectTopologyChain);
    work->chain = std::move(chain);
    return Queue(env, std::move(work));
  });
}
napi_value InspectRoleRightsCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[3];
    if (!Arguments(env, info, 2, args)) return nullptr;
    auto chain = LiveChain(env, args[0]);
    if (!chain) return nullptr;
    if (!chain->security_read()) {
      napi_throw_type_error(env, "ERR_STORAGE_NATIVE_SECURITY_CAPABILITY", "Expected a security-readable chain.");
      return nullptr;
    }
    auto work = std::make_unique<Work>(Operation::InspectRoleRights);
    if (!String(env, args[1], work->text)) return nullptr;
    try {
      if (work->text.find('\0') != std::string::npos) throw NativeError("ERR_STORAGE_NATIVE_RIGHTS_ROLE");
      work->role = ParseDirectoryRole(work->text.c_str());
      // Capture before enqueue: active caller impersonation must not disappear
      // silently when Node moves execution into its worker pool.
      work->rights_context = CaptureRightsContext();
    } catch (const NativeError& error) {
      const auto value = ErrorValue(env, error.code, error.os_code);
      if (value) napi_throw(env, value);
      return nullptr;
    }
    work->chain = std::move(chain);
    return Queue(env, std::move(work));
  });
}
napi_value CompareTopologyChainsCallback(napi_env env, napi_callback_info info) {
  return Guard(env, [&]() -> napi_value {
    napi_value args[3];
    if (!Arguments(env, info, 2, args)) return nullptr;
    auto left = LiveChain(env, args[0]);
    if (!left) return nullptr;
    auto right = LiveChain(env, args[1]);
    if (!right) return nullptr;
    auto work = std::make_unique<Work>(Operation::CompareTopologyChains);
    work->chain = std::move(left);
    work->other_chain = std::move(right);
    return Queue(env, std::move(work));
  });
}
napi_value CloseCallback(napi_env env, napi_callback_info info) {
  napi_value args[2], result;
  if (!Arguments(env, info, 1, args)) return nullptr;
  Envelope* slot = Unwrap(env, args[0]);
  if (!slot) return nullptr;
  slot->resource.reset();
  slot->chain.reset();
  return Check(env, napi_get_undefined(env, &result)) ? result : nullptr;
}
}  // namespace
napi_value Initialize(napi_env env, napi_value exports) {
  const napi_property_descriptor descriptors[] = {
    {"inspectRoleRights", nullptr, InspectRoleRightsCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"inspectTopologyChain", nullptr, InspectTopologyChainCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"compareTopologyChains", nullptr, CompareTopologyChainsCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"captureSecurityChain", nullptr, CaptureSecurityChainCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"inspectSecurityChain", nullptr, InspectSecurityChainCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"captureRootChain", nullptr, CaptureRootChainCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"inspectChain", nullptr, InspectChainCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"openRoot", nullptr, OpenRootCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"openFile", nullptr, OpenFileCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"inspect", nullptr, InspectCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"close", nullptr, CloseCallback, nullptr, nullptr, nullptr, napi_default, nullptr}
  };
  return Check(env, napi_define_properties(env, exports, 11, descriptors)) ? exports : nullptr;
}
}  // namespace dss::storage::probe
NAPI_MODULE(NODE_GYP_MODULE_NAME, dss::storage::probe::Initialize)

// Якщо HANDLE захотів у JSON — поверніть його в машинне відділення.
