const verificationService = require('../services/verificationService');
const { parseDevMode } = require('../utils/devMode');

/**
 * POST /urls/analyze
 *
 * Recebe a URL a verificar, relatório opcional do cliente e dev_mode.
 * Com dev_mode=true, a resposta inclui accessibility.detailed_report
 * com exceções completas do axe-core (nós HTML, seletores, failureSummary).
 */
const verifyUrl = async (req, res, next) => {
  try {
    const { url, accessibility_report, dev_mode } = req.body;
    const devMode = parseDevMode(dev_mode);
    const userId = req.user?.id ?? null;

    const analysisResult = await verificationService.verifyUrl(
      url,
      accessibility_report,
      userId,
      devMode
    );

    return res.status(200).json(analysisResult);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyUrl
};
