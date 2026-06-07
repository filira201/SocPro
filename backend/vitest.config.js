const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.{test,spec}.js"],
    exclude: ["node_modules/**"],
    clearMocks: true,
  },
});
