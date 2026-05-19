const reportService = require('../services/reportService');

const createReport = async (req, res, next) => {
  try {
    const report = await reportService.createReport(req.user.id, req.body);
    return res.status(201).json({ sucesso: true, report });
  } catch (error) {
    next(error);
  }
};

const getWorstAccessibilityRankings = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const min_analyses = parseInt(req.query.min_analyses, 10) || 1;
    const rankings = await reportService.getWorstAccessibilityRankings({ limit, min_analyses });
    return res.status(200).json({
      sucesso: true,
      description: 'Sites com piores notas (quality_rating menor = pior acessibilidade)',
      rankings
    });
  } catch (error) {
    next(error);
  }
};

const getBestAccessibilityRankings = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const min_analyses = parseInt(req.query.min_analyses, 10) || 1;
    const rankings = await reportService.getBestAccessibilityRankings({ limit, min_analyses });
    return res.status(200).json({
      sucesso: true,
      description: 'Sites com melhores notas (quality_rating maior = melhor acessibilidade)',
      rankings
    });
  } catch (error) {
    next(error);
  }
};

const getMostReportedSites = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const rankings = await reportService.getMostReportedSites({ limit });
    return res.status(200).json({ sucesso: true, rankings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getWorstAccessibilityRankings,
  getBestAccessibilityRankings,
  getMostReportedSites
};
