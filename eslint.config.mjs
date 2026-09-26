import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // `components/ui` and `components/ai-elements` are vendored from shadcn/ui
    // and ai-elements. The React Compiler rules added in Next 16 flag patterns
    // those libraries ship as-is, so we keep them on for code we own and off
    // for the vendored copies. Delete this block once those directories are
    // replaced with local implementations.
    files: ["components/ui/**", "components/ai-elements/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".kilo/**",
    ".superpowers/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
