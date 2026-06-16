const tsParser = require("@typescript-eslint/parser")
const prettier = require("eslint-plugin-prettier")
const typescript = require("@typescript-eslint/eslint-plugin")

module.exports = [
  {
    files: ["**/*.ts"], // Áp dụng cho tất cả tệp TypeScript
    ignores: ["node_modules/**", "dist/**"], // Loại trừ thư mục không cần kiểm tra
    languageOptions: {
      parser: tsParser, // Yêu cầu @typescript-eslint/parser
      ecmaVersion: 2020,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": typescript,
      prettier: prettier,
    },
    rules: {
      "prettier/prettier": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]
