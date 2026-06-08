const test = require("node:test");
const assert = require("node:assert");
const cron = require("node-cron");
const cleanupJob = require("../../src/jobs/dbCleanup");

test("cronCleanupLogic - Verifica agendamento correto do cron job", (t) => {
  const originalSchedule = cron.schedule;
  let scheduledExpression = "";

  cron.schedule = (expression, callback) => {
    scheduledExpression = expression;
  };

  cleanupJob.scheduleCleanup();

  assert.strictEqual(scheduledExpression, "0 3 * * *");

  cron.schedule = originalSchedule;
});
