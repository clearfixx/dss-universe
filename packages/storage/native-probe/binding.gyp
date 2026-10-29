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
      "sources": ["src/addon.cc", "src/native-object.cc"],
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
        ["OS=='win'", {"sources": ["src/platform-win.cc"], "libraries": ["ntdll.lib"]},
          {"sources": ["src/platform-posix.cc"]}]
      ]
    }
  ]
}
