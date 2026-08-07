// eslint-config-next 16 ships flat configs already. Running them through
// FlatCompat asked eslintrc to load a flat array as a legacy shareable config,
// and every lint invocation died in _loadExtendedShareableConfig — so nothing
// in this repository had been linted for as long as that dependency was current.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "workers/*/.wrangler/**",
      "venv/**",
      "graphify-out/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // Carried over from the .eslintrc.json this replaces. ESLint 9 ignored that
    // file, so the underscore convention the code is written in — `_node`,
    // `_request`, `_error` for arguments a signature requires but nothing uses
    // — was being reported as 65 unused variables.
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
