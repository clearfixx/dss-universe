/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: packages/storage/eslint.config.mjs
 *
 * 🎯 Purpose:
 * Applies shared lint rules to the standalone storage contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { dssBaseRules } from "@dss/eslint-config";
import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
  rules: dssBaseRules,
});
