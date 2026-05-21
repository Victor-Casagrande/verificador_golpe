const validateUrl = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
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
