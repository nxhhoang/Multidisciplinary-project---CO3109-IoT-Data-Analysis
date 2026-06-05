const { Pool } = require("pg");

let pool;

function getPostgresPool() {
  if (pool) {
    return pool;
  }

  const {
    POSTGRES_HOST = "localhost",
    POSTGRES_PORT = "5432",
    POSTGRES_USER = "postgres",
    POSTGRES_PASSWORD = "postgres",
    POSTGRES_DATABASE = "smart_agriculture",
  } = process.env;

  pool = new Pool({
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DATABASE,
  });

  return pool;
}

async function pingPostgres() {
  const client = await getPostgresPool().connect();

  try {
    await client.query("SELECT 1");
    return true;
  } finally {
    client.release();
  }
}

module.exports = {
  getPostgresPool,
  pingPostgres,
};
