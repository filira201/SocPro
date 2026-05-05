import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importPlugin from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "build", "src/shared/ui/kit"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      "max-lines": "off",

      "import/no-cycle": ["error", { maxDepth: 3 }],
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          alphabetize: { order: "asc" },
          "newlines-between": "always",
          pathGroups: [
            { pattern: "*/**/*.scss", group: "sibling", position: "after" },
            { pattern: "./*.scss", group: "sibling", position: "after" },
          ],
        },
      ],
      "import/default": "off",
      "import/no-named-as-default": "off",

      "no-irregular-whitespace": "off",
      curly: ["error", "all"],
      quotes: ["error", "double"],
      semi: "error",
      "no-alert": "error",
      "no-console": "warn",
      "no-redeclare": "error",
      "no-var": "error",
      "no-template-curly-in-string": "error",
      "prefer-destructuring": "off",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",

      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/ban-ts-comment": "off",

      "no-control-regex": "off",
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: ["return", "block-like", "throw", "if", "function", "default"],
        },
        {
          blankLine: "always",
          prev: ["block-like", "throw", "if", "function"],
          next: "*",
        },
      ],
      "no-dupe-else-if": "error",
      eqeqeq: "error",
      "no-empty": "error",
      "no-fallthrough": "error",
      "no-global-assign": "error",
    },
  },
]);
