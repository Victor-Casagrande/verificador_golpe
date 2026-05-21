/**
 * Normaliza o parâmetro dev_mode da requisição para boolean.
 * Aceita true explícito ou a string "true" (útil em query strings).
 */
const parseDevMode = (value) => value === true || value === 'true';

module.exports = { parseDevMode };
