module.exports = {
  default: {
    paths: ['.specengine/spec/features/**/*.feature'],
    require: ['tests/steps/**/*.js', 'tests/support/**/*.js'],
    format: ['progress', 'json:reports/cucumber.json'],
    publishQuiet: true
  }
};
