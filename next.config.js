/** next.config.js */
module.exports = {
  reactStrictMode: true,
  // Keep API body size reasonably large
  api: { bodyParser: { sizeLimit: '12mb' } }
};
