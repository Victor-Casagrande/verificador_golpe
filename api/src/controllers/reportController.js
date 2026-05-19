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
    const rankings = await reportService.getWorstAccessibilityRankings({ limit });
    return res.status(200).json({ sucesso: true, rankings });
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
  getMostReportedSites
};
