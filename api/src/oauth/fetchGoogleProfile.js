const fetchGoogleProfile = async (accessToken) => {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Google userinfo API: HTTP ${res.status}`);
  }

  const user = await res.json();

  if (!user.email || !user.verified_email) {
    throw new Error('Google não retornou e-mail verificado.');
  }

  return {
    providerUserId: String(user.id),
    email: user.email.toLowerCase(),
    name: user.name || user.email.split('@')[0]
  };
};

module.exports = fetchGoogleProfile;
