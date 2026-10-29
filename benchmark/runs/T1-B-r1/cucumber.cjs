module.exports = {
  default: {
    paths: ['.specengine/spec/features/**/*.feature', 'tests/features/**/*.feature'],
    // TypeScript is loaded via `node --import tsx` in the npm test script (Node >= 20.6
    // rejects tsx through the deprecated --loader path that cucumber's `loader` option uses).
    import: ['tests/steps/**/*.ts', 'tests/support/**/*.ts'],
    format: ['progress', 'json:reports/cucumber.json']
  }
};
