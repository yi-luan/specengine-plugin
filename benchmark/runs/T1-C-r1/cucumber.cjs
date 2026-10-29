module.exports = {
  default: {
    paths: ['.specengine/spec/features/**/*.feature', 'tests/features/**/*.feature'],
    import: ['tests/steps/**/*.ts', 'tests/support/**/*.ts'],
    format: ['progress', 'json:reports/cucumber.json'],
    publishQuiet: true
  }
};
