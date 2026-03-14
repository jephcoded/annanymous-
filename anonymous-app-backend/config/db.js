const dns = require("dns");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const parsedUrl = connectionString ? new URL(connectionString) : null;

const lookupPreferIpv4 = (hostname, options, callback) => {
  const done = typeof options === "function" ? options : callback;
  const normalizedOptions =
    typeof options === "object" && options !== null ? options : undefined;

  dns.lookup(
    hostname,
    {
      ...normalizedOptions,
      family: 4,
      all: false,
      verbatim: false,
    },
    (error, address, family) => {
      if (!error && address) {
        done(null, address, family ?? 4);
        return;
      }

      dns.resolve4(hostname, (resolve4Error, ipv4Addresses) => {
        if (!resolve4Error && ipv4Addresses?.length) {
          done(null, ipv4Addresses[0], 4);
          return;
        }

        dns.resolve6(hostname, (resolve6Error, ipv6Addresses) => {
          if (!resolve6Error && ipv6Addresses?.length) {
            done(null, ipv6Addresses[0], 6);
            return;
          }

          done(error || resolve4Error || resolve6Error);
        });
      });
      return;
    },
  );
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
