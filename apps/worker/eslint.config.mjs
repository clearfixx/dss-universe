import { dssBaseRules } from "@dss/eslint-config";
import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
  rules: dssBaseRules,
});
