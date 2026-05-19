const oauthService = require('../services/oauthService');

const listProviders = (req, res) => {
  return res.status(200).json({
    sucesso: true,
    providers: oauthService.getConfiguredProviders()
  });
};

const redirectToProvider = (req, res, next) => {
  try {
    const url = oauthService.buildAuthorizeUrl(req.params.provider);
    return res.redirect(url);
  } catch (error) {
    next(error);
  }
};

const handleCallback = async (req, res, next) => {
  try {
    const result = await oauthService.handleCallback(req.params.provider, {
      code: req.query.code,
      state: req.query.state
    });

    const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT;
    if (redirectUrl) {
      const url = new URL(redirectUrl);
      url.searchParams.set('token', result.token);
      return res.redirect(url.toString());
    }

    return res.status(200).json(oauthService.formatAuthResponse(result));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProviders,
  redirectToProvider,
  handleCallback
};
