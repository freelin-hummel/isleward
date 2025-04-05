import { defineConfig, globalIgnores  } from "eslint/config";
import js from "@eslint/js";
import react from "eslint-plugin-react";
import globals from "globals";

export default defineConfig([
	globalIgnores([
		'dist/**/*.*'
	]),
  {
    ...js.configs.recommended,
    files: ["vite.config.js", "vitePlugins/**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...js.configs.recommended.rules
    }
  },
  {
    ...js.configs.recommended,

    ...react.configs.flat.recommended,

    files: ["**/*.{js,mjs,cjs,jsx}"],
    ignores: ["dist"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.browser,
        $: "writable",
        scale: "writable",
        scaleMult: "writable",
        isMobile: "writable",
        _: 'writable'
      }
    },

    plugins: {
      react
    },

    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,

      "react/prop-types": "off"
    },
    "settings": {
    "react": {
      "version": "detect"
    }
  }
  }
]);
