const dns = require("dns");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const parsedUrl = connectionString ? new URL(connectionString) : null;

const lookupPreferIpv4 = (hostname, options, callback) => {
  const done = typeof options === "function" ? options : callback;
  const normalizedOptions =
    typeof options === "object" && options !== null ? options : {};

  const requestAllAddresses = {
    ...normalizedOptions,
    all: true,
    verbatim: false,
  };

  dns.lookup(hostname, requestAllAddresses, (error, addresses) => {
    if (!error && addresses?.length) {
      const preferredAddress =
        addresses.find((entry) => entry.family === 4) ?? addresses[0];

      done(null, preferredAddress.address, preferredAddress.family);
      return;
    }

    dns.resolve6(hostname, (resolveError, addresses) => {
      if (!resolveError && addresses?.length) {
        done(null, addresses[0], 6);
        return;
      }

      done(error);
    });
  });
};

const pool = new Pool({
  user: parsedUrl ? decodeURIComponent(parsedUrl.username) : undefined,
  password: parsedUrl ? decodeURIComponent(parsedUrl.password) : undefined,
  host: parsedUrl?.hostname,
  port: parsedUrl?.port ? Number(parsedUrl.port) : 5432,
  database: parsedUrl?.pathname?.replace(/^\//, ""),
  ssl:
    process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
  lookup: lookupPreferIpv4,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
