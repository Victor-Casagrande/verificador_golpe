/**
 * Validação de denúncias comunitárias (POST /reports).
 */
const { validateUrl } = require("../utils/validators");
const { VALID_REPORT_TYPES } = require("../repositories/reportRepository");
const AppError = require("../utils/AppError");

const validateCreateReport = (req, res, next) => {
  const { url, report_type, comment } = req.body;

  if (!url || !report_type) {
    return next(new AppError("URL e report_type são obrigatórios.", 400));
  }

  if (!validateUrl(url)) {
    return next(new AppError("URL inválida.", 400));
  }

  if (!VALID_REPORT_TYPES.includes(report_type)) {
    return next(
      new AppError(`report_type inválido. Valores aceitos: ${VALID_REPORT_TYPES.join(", ")}.`, 400),
    );
  }

  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    return next(new AppError("comment deve ser uma string.", 400));
  }

  // Defesa contra DB Bloat: Limite rígido de 500 caracteres
  if (comment && comment.length > 500) {
    return next(new AppError("comment deve ter no máximo 500 caracteres.", 400));
  }

  next();
};

module.exports = {
  validateCreateReport,
};
