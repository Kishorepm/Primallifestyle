export default [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        alert: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        URL: "readonly",
        IntersectionObserver: "readonly",
        console: "readonly",
        location: "readonly",
        advanceCarousel: "writable",
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_|^i$|^entry$" }],
      "no-undef": "error",
      "no-console": "off",
      "semi": ["error", "always"],
      "eqeqeq": "error"
    }
  }
];
