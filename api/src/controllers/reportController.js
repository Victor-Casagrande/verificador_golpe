const reportService = require("../services/reportService");
const NodeCache = require("node-cache");

const rankingCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
const pendingRequests = new Map();

const createReport = async (req, res, next) => {
  try {
    const report = await reportService.createReport(req.user.id, req.body);
    return res.status(201).json({ sucesso: true, report });
  } catch (error) {
    next(error);
  }
};

const getMyReports = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { items, total } = await reportService.getUserReports(req.user.id, {
      limit,
      offset,
    });
    return res.status(200).json({ sucesso: true, total, limit, offset, items });
  } catch (error) {
    next(error);
  }
};

const getWorstAccessibilityRankings = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const min_analyses = parseInt(req.query.min_analyses, 10) || 1;
    
    const cacheKey = `worst_accessibility_${limit}_${min_analyses}`;
    const cachedRankings = rankingCache.get(cacheKey);
    if (cachedRankings) {
      return res.status(200).json(cachedRankings);
    }

    if (pendingRequests.has(cacheKey)) {
      const responseData = await pendingRequests.get(cacheKey);
      return res.status(200).json(responseData);
    }

    const fetchPromise = reportService.getWorstAccessibilityRankings({
      limit,
      min_analyses,
    }).then(rankings => {
      const responseData = {
        sucesso: true,
        description: "Sites com piores notas (quality_rating menor = pior acessibilidade)",
        rankings,
      };
      rankingCache.set(cacheKey, responseData);
      pendingRequests.delete(cacheKey);
      return responseData;
    }).catch(err => {
      pendingRequests.delete(cacheKey);
      throw err;
    });

    pendingRequests.set(cacheKey, fetchPromise);
    const responseData = await fetchPromise;
    
    return res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

const getBestAccessibilityRankings = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const min_analyses = parseInt(req.query.min_analyses, 10) || 1;

    const cacheKey = `best_accessibility_${limit}_${min_analyses}`;
    const cachedRankings = rankingCache.get(cacheKey);
    if (cachedRankings) {
      return res.status(200).json(cachedRankings);
    }

    if (pendingRequests.has(cacheKey)) {
      const responseData = await pendingRequests.get(cacheKey);
      return res.status(200).json(responseData);
    }

    const fetchPromise = reportService.getBestAccessibilityRankings({
      limit,
      min_analyses,
    }).then(rankings => {
      const responseData = {
        sucesso: true,
        description: "Sites com melhores notas (quality_rating maior = melhor acessibilidade)",
        rankings,
      };
      rankingCache.set(cacheKey, responseData);
      pendingRequests.delete(cacheKey);
      return responseData;
    }).catch(err => {
      pendingRequests.delete(cacheKey);
      throw err;
    });

    pendingRequests.set(cacheKey, fetchPromise);
    const responseData = await fetchPromise;
    
    return res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

const getMostReportedSites = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    
    const cacheKey = `most_reported_${limit}`;
    const cachedRankings = rankingCache.get(cacheKey);
    if (cachedRankings) {
      return res.status(200).json(cachedRankings);
    }

    if (pendingRequests.has(cacheKey)) {
      const responseData = await pendingRequests.get(cacheKey);
      return res.status(200).json(responseData);
    }

    const fetchPromise = reportService.getMostReportedSites({ limit }).then(rankings => {
      const responseData = { sucesso: true, rankings };
      rankingCache.set(cacheKey, responseData);
      pendingRequests.delete(cacheKey);
      return responseData;
    }).catch(err => {
      pendingRequests.delete(cacheKey);
      throw err;
    });

    pendingRequests.set(cacheKey, fetchPromise);
    const responseData = await fetchPromise;
    
    return res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getMyReports,
  getWorstAccessibilityRankings,
  getBestAccessibilityRankings,
  getMostReportedSites,
  rankingCache, // Exported for testing purposes to flush if needed
};
