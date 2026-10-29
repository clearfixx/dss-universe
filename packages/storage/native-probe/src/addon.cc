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
#include <new>
#include <utility>

namespace dss::storage::probe {
namespace {
const napi_type_tag kCapabilityTag {0x44535353544f5241ULL, 0x4745503143415031ULL};
struct Envelope { std::shared_ptr<NativeObject> resource; };
enum class Operation { OpenRoot, OpenFile, Inspect };
struct Work {
  Operation operation;
  napi_async_work work = nullptr;
  napi_deferred deferred = nullptr;
  std::string text;
  std::shared_ptr<NativeObject> resource;
  std::shared_ptr<NativeObject> result;
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
napi_value Wrap(napi_env env, const std::shared_ptr<NativeObject>& resource) {
  std::unique_ptr<Envelope> slot(new (std::nothrow) Envelope {resource});
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
  if (!slot->resource) napi_throw_error(env, "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED", "Native probe capability is closed.");
  return slot->resource;
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
void Execute(napi_env, void* data) {
  Work& work = *static_cast<Work*>(data);
  try {
    switch (work.operation) {
      case Operation::OpenRoot: work.result = OpenRoot(work.text); break;
      case Operation::OpenFile: work.result = OpenFile(*work.resource, work.text); break;
      case Operation::Inspect: work.metadata = Inspect(*work.resource); break;
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
  napi_value result = work->operation == Operation::Inspect
      ? MetadataValue(env, work->metadata) : Wrap(env, work->result);
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
napi_value CloseCallback(napi_env env, napi_callback_info info) {
  napi_value args[2], result;
  if (!Arguments(env, info, 1, args)) return nullptr;
  Envelope* slot = Unwrap(env, args[0]);
  if (!slot) return nullptr;
  slot->resource.reset();
  return Check(env, napi_get_undefined(env, &result)) ? result : nullptr;
}
}  // namespace
napi_value Initialize(napi_env env, napi_value exports) {
  const napi_property_descriptor descriptors[] = {
    {"openRoot", nullptr, OpenRootCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"openFile", nullptr, OpenFileCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"inspect", nullptr, InspectCallback, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"close", nullptr, CloseCallback, nullptr, nullptr, nullptr, napi_default, nullptr}
  };
  return Check(env, napi_define_properties(env, exports, 4, descriptors)) ? exports : nullptr;
}
}  // namespace dss::storage::probe
NAPI_MODULE(NODE_GYP_MODULE_NAME, dss::storage::probe::Initialize)

// Якщо HANDLE захотів у JSON — поверніть його в машинне відділення.
