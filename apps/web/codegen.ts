/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web GraphQL
 * 📄 File: apps/web/codegen.ts
 *
 * 🎯 Purpose:
 * Generates typed Apollo operations from the canonical API schema.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../api/src/schema.gql",
  documents: ["src/graphql/**/*.graphql"],
  generates: {
    "src/gql/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
  ignoreNoDocuments: false,
};

export default config;
