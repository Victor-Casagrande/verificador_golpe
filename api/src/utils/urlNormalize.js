const { URL } = require("url");

const extractSiteHost = (urlString) => {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
};

module.exports = {
  extractSiteHost,
};
