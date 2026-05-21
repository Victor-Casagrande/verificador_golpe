process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const app = require("../../src/app");

module.exports = app;
