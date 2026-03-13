/* eslint-env node */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const sql = fs.readFileSync(
  path.join(process.cwd(), "database", "schema.sql"),
  "utf8",
);

pool
  .query(sql)
  .then(() => {
    console.log("Schema applied successfully.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
