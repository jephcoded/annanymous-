const dns = require("dns");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const parsedUrl = connectionString ? new URL(connectionString) : null;
const dnsPromises = dns.promises;

const resolveDatabaseHost = async (hostname) => {
  if (!hostname) {
    return hostname;
  }

  try {
    const ipv4 = await dnsPromises.lookup(hostname, {
      family: 4,
      all: false,
      verbatim: false,
    });

    if (ipv4?.address) {
      return ipv4.address;
    }
  } catch (lookupError) {
    try {
      const ipv4Addresses = await dnsPromises.resolve4(hostname);

      if (ipv4Addresses?.length) {
        return ipv4Addresses[0];
      }
    } catch (resolve4Error) {
      try {
        const ipv6Addresses = await dnsPromises.resolve6(hostname);

        if (ipv6Addresses?.length) {
          return ipv6Addresses[0];
        }
      } catch (resolve6Error) {
        throw lookupError || resolve4Error || resolve6Error;
      }
    }
  }

  return hostname;
};

let poolPromise;

const createPool = async () => {
  const host = await resolveDatabaseHost(parsedUrl?.hostname);

  return new Pool({
    user: parsedUrl ? decodeURIComponent(parsedUrl.username) : undefined,
    password: parsedUrl ? decodeURIComponent(parsedUrl.password) : undefined,
    host,
    port: parsedUrl?.port ? Number(parsedUrl.port) : 5432,
    database: parsedUrl?.pathname?.replace(/^\//, ""),
    ssl:
      process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: false }
        : false,
  });
};

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = createPool();
  }

  return poolPromise;
};

const pool = {
  query: async (text, params) => {
    const resolvedPool = await getPool();
    return resolvedPool.query(text, params);
  },
  connect: async () => {
    const resolvedPool = await getPool();
    return resolvedPool.connect();
  },
  end: async () => {
    const resolvedPool = await getPool();
    return resolvedPool.end();
  },
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
