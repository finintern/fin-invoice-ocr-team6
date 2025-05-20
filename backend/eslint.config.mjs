import pluginJs from "@eslint/js";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs"
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest 
      }
    },
    rules: {
      // Allow unused parameters if they start with underscore
      "no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  },
  // Add this new configuration object for k6 load test files
  {
    files: ["**/tests/load/*.mjs"],
    languageOptions: {
      globals: {
        __ENV: "readonly",
        open: "readonly",
        sleep: "readonly"
      }
    }
  },
  pluginJs.configs.recommended
];