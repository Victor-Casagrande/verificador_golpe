const verificationService = require('../services/verificationService');

const verifyUrl = async (req, res, next) => {
  try {
    const { url, accessibility_report } = req.body;
    
    const userId = req.user?.id ?? null;
    const analysisResult = await verificationService.verifyUrl(
      url,
      accessibility_report,
      userId
    );
    
    return res.status(200).json(analysisResult);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyUrl
};