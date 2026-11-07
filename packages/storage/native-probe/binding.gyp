# ===============================================================
# 🚀 DSS Universe
# 📦 Module: Storage Native P1
# 📄 File: packages/storage/native-probe/binding.gyp
# 🎯 Purpose: Builds private platform sources with Node-API8 and strict warnings.
# ⚠️ Important: No runtime activation or public package exports are configured.
# 🚀 Build. Share. Grow.
# ===============================================================
{
  "targets": [
    {
      "target_name": "dss_storage_probe",
      "sources": ["src/addon.cc", "src/native-object.cc", "src/root-chain.cc", "src/security-evidence.cc", "src/topology-evidence.cc", "src/rights-model.cc", "src/rights-evidence.cc"],
      "defines": ["NAPI_VERSION=8"],
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-Wall", "-Wextra", "-Werror"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LANGUAGE_STANDARD": "c++20"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "WarningLevel": 4,
          "WarnAsError": "true"
        }
      },
      "conditions": [
        ["OS=='win'", {"sources": ["src/platform-win.cc", "src/security-win.cc", "src/topology-win.cc", "src/rights-win.cc"], "libraries": ["ntdll.lib", "advapi32.lib"]},
          {"sources": ["src/platform-posix.cc", "src/security-posix.cc", "src/rights-posix.cc"]}],
        ["OS=='linux'", {"sources": ["src/security-linux.cc", "src/topology-linux.cc", "src/rights-linux.cc"]}],
        ["OS=='mac'", {"sources": ["src/security-darwin.cc", "src/topology-darwin.cc", "src/rights-darwin.cc"]}]
      ]
    },
    {
      "target_name": "dss_rights_native_test",
      "type": "executable",
      "sources": ["rights-native-test.cc", "src/native-object.cc", "src/root-chain.cc", "src/rights-model.cc", "src/rights-evidence.cc"],
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-Wall", "-Wextra", "-Werror", "-std=c++20"],
      "xcode_settings": {"GCC_ENABLE_CPP_EXCEPTIONS": "YES", "CLANG_CXX_LANGUAGE_STANDARD": "c++20"},
      "msvs_settings": {"VCCLCompilerTool": {"ExceptionHandling": 1, "WarningLevel": 4, "WarnAsError": "true"}},
      "conditions": [
        ["OS=='win'", {"sources": ["src/platform-win.cc", "src/rights-win.cc"], "libraries": ["ntdll.lib", "advapi32.lib"]},
          {"sources": ["src/platform-posix.cc", "src/rights-posix.cc", "rights-test-posix.cc"]}],
        ["OS=='linux'", {"sources": ["src/rights-linux.cc"]}],
        ["OS=='mac'", {"sources": ["src/rights-darwin.cc"]}]
      ]
    },
    {
      "target_name": "dss_acl_contract_proof",
      "type": "none",
      "conditions": [
        ["OS!='win'", {
          "type": "executable",
          "sources": ["../../../tools/agent-helpers/debt037/acl-contract-proof.cc"],
          "cflags_cc!": ["-fno-exceptions"],
          "cflags_cc": ["-Wall", "-Wextra", "-Werror", "-std=c++20"],
          "xcode_settings": {"GCC_ENABLE_CPP_EXCEPTIONS": "YES", "CLANG_CXX_LANGUAGE_STANDARD": "c++20"},
          "conditions": [
            ["OS=='linux'", {"sources": ["../../../tools/agent-helpers/debt037/acl-contract-linux.cc"]}],
            ["OS=='mac'", {"sources": ["../../../tools/agent-helpers/debt037/acl-contract-darwin.cc"]}]
          ]
        }]
      ]
    }
  ]
}
