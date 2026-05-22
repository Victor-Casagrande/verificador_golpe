const validateUrl = (urlString) => {
  try {
    if (!urlString || typeof urlString !== "string") return false;

    if (urlString.length > 2048) return false;

    const parsedUrl = new URL(urlString.trim());

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }

    const hostname = parsedUrl.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    const isAwsMetadata = hostname === "169.254.169.254";

    if (isLocalhost || isAwsMetadata) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  validateUrl,
};
