/**
 * Interpreta o flag `dev_mode` do POST /urls/analyze (boolean ou string "true").
 */
const parseDevMode = (value) => value === true || value === "true";

module.exports = { parseDevMode };
