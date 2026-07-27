const { join } = require('path')

/**
 * Render uploads only the project directory (rootDir) from build to
 * the runtime instance — the default cache at ~/.cache/puppeteer lives
 * outside it and never makes it to the deployed server. Keeping the
 * downloaded Chrome inside the project fixes that.
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
}
