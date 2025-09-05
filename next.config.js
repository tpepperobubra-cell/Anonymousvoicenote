/** next.config.js */
module.exports = {
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: '20mb' // allow larger audio uploads encoded as base64
    }
  }
};
