const { URL } = require('url');

const checkStaticHeuristics = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);
    const domain = parsedUrl.hostname;

    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
    const hyphenCount = (domain.match(/-/g) || []).length;
    const manyHyphens = hyphenCount >= 3;
    const suspiciousTld = /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$/.test(domain);

    if (isIp || manyHyphens || suspiciousTld) {
      return {
        is_danger: true,
        status: 'Aparência Suspeita (Heurística)',
        reason: 'Características estruturais da URL fortemente associadas a golpes.'
      };
    }

    return {
      is_danger: false,
      status: 'Seguro',
      reason: 'Nenhuma ameaça detectada localmente ou nos bancos de dados.'
    };
  } catch {
    return {
      is_danger: true,
      status: 'Erro de Formato',
      reason: 'A URL fornecida possui uma estrutura anômala ou ilegível.'
    };
  }
};

module.exports = {
  checkStaticHeuristics
};
