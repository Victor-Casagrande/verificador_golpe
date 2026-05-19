const reportRepository = require('../repositories/reportRepository');
const db = require('../config/database');
const AppError = require('../utils/AppError');

const createReport = async (userId, { url, analysis_id, report_type, comment }) => {
  if (analysis_id) {
    const analysis = await db.query(
      'SELECT id FROM url_analyses WHERE id = $1',
      [analysis_id]
    );
    if (analysis.rows.length === 0) {
      throw new AppError('Análise referenciada não encontrada.', 404);
    }
  }

  return reportRepository.create({
    userId,
    urlAnalysisId: analysis_id,
    url,
    reportType: report_type,
    comment
  });
};

const getWorstAccessibilityRankings = async ({ limit, min_analyses }) => {
  return reportRepository.findWorstAccessibilitySites({
    limit,
    minAnalyses: min_analyses || 1
  });
};

const getBestAccessibilityRankings = async ({ limit, min_analyses }) => {
  return reportRepository.findBestAccessibilitySites({
    limit,
    minAnalyses: min_analyses || 1
  });
};

const getMostReportedSites = async ({ limit }) => {
  return reportRepository.findReportStatsByUrl(limit);
};

module.exports = {
  createReport,
  getWorstAccessibilityRankings,
  getBestAccessibilityRankings,
  getMostReportedSites
};
