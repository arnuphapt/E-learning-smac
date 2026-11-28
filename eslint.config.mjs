import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/dragon/**",
  ]),

  // UI architecture guards (.claude/rules/ui-architecture.md).
  {
    files: ["app/**/*.{js,jsx,ts,tsx}", "components/**/*.{js,jsx,ts,tsx}"],
    // components/ui/*.tsx are the stock shadcn primitives.
    ignores: ["components/ui/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...["button", "input", "select", "textarea", "table", "dialog", "progress"].map((tag) => ({
          selector: `JSXOpeningElement[name.name='${tag}']`,
          message: `Native <${tag}> is not allowed outside components/ui. Use the shadcn primitive or a components/common block (.claude/rules/ui-architecture.md).`,
        })),
      ],
    },
  },
  {
    files: ["app/**/*.{js,jsx,ts,tsx}", "components/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/ui/AiAvatar", "**/ui/AiChat", "**/ui/ConfirmDialog", "**/ui/Icon", "**/ui/ImpersonationBanner",
                "**/ui/Loading", "**/ui/Primitives", "**/ui/Shared", "**/ui/Table", "**/ui/LegacyTable",
                "**/ui/Toast", "**/ui/dialog-focus",
              ],
              caseSensitive: true, // ui/table (shadcn) must not match ui/Table (old)
              message: "Old hand-written UI is deleted and must not return. Use shadcn components/ui/* or components/common/* (.claude/rules/ui-architecture.md).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: { "max-lines": ["error", { max: 1000, skipBlankLines: false, skipComments: false }] },
  },
]);

export default eslintConfig;
