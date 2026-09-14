const sql = require('mssql');
const config = require('./config');

// DB_SERVER pode vir como "host" ou "host,porta" (padrão usado no exemplo pyodbc do contexto)
function parseServer(raw) {
  if (!raw) return { host: undefined, port: undefined };
  const [host, port] = raw.split(',').map((v) => v.trim());
  return { host, port: port ? Number(port) : undefined };
}

const { host, port } = parseServer(config.db.server);

const sqlConfig = {
  server: host,
  port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  options: {
    encrypt: config.db.encrypt,
    trustServerCertificate: config.db.trustServerCertificate,
  },
  connectionTimeout: 30000,
  requestTimeout: 120000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(sqlConfig)
      .connect()
      .catch((err) => {
        poolPromise = undefined;
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
