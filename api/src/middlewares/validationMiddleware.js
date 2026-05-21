const { validateUrl } = require("../utils/validators");

const validateVerificationRequest = (req, res, next) => {
  const { url, accessibility_report, dev_mode } = req.body;

  if (!url) {
    return res.status(400).json({
      error: "Bad Request",
      message: "URL is required",
    });
  }

  if (!validateUrl(url)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid URL format",
    });
  }

  if (accessibility_report !== undefined) {
    if (!Array.isArray(accessibility_report)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "O campo accessibility_report deve ser um array estruturado.",
      });
    }

    const isValidStructure = accessibility_report.every(
      (item) =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    );

    if (!isValidStructure) {
      return res.status(400).json({
        error: "Bad Request",
        message:
          "Estrutura inválida dentro de accessibility_report. Esperava-se um array de objetos JSON.",
      });
    }
  }

  if (
    dev_mode !== undefined &&
    dev_mode !== true &&
    dev_mode !== false &&
    dev_mode !== "true"
  ) {
    return res.status(400).json({
      error: "Bad Request",
      message:
        'O campo dev_mode deve ser booleano (true/false) ou a string "true".',
    });
  }

  next();
};

const validateOptions = (req, res, next) => {
  const { options } = req.body;

  if (options && typeof options !== "object") {
    return res.status(400).json({
      error: "Bad Request",
      message: "Options must be an object",
    });
  }

  next();
};

module.exports = {
  validateVerificationRequest,
  validateOptions,
};
