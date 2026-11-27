import base from "./playwright.config";

/** The same stack with the API in bank-transfer mode (how the shop takes payment today). */
const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default {
  ...base,
  testIgnore: undefined,
  testMatch: /transfer\.spec\.ts/,
  webServer: servers.map((s) =>
    s.command.includes("wrangler dev") ? { ...s, command: `${s.command} --var PAYMENT_MODE:transfer` } : s,
  ),
};
