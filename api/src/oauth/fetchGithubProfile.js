const fetchGithubProfile = async (accessToken) => {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "sentinela-apl",
    },
  });

  if (!userRes.ok) {
    throw new Error(`GitHub user API: HTTP ${userRes.status}`);
  }

  const user = await userRes.json();

  let email = user.email;

  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "sentinela-apl",
      },
    });

    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = emails.find((e) => e.primary && e.verified);
      const verified = emails.find((e) => e.verified);
      email = primary?.email || verified?.email || emails[0]?.email;
    }
  }

  if (!email) {
    throw new Error(
      "GitHub não retornou e-mail verificado. Configure um e-mail público ou verificado na conta.",
    );
  }

  return {
    providerUserId: String(user.id),
    email: email.toLowerCase(),
    name: user.name || user.login || email.split("@")[0],
  };
};

module.exports = fetchGithubProfile;
