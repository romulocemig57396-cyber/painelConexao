const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

// Healthcheck de banco: só abre a conexão e roda SELECT 1, sem tocar em nenhuma
// tabela de negócio. Use para validar credenciais/host/porta antes de testar queries reais.
router.get('/health/db', async (_req, res) => {
  const inicio = Date.now();
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      resultado: result.recordset,
      tempoMs: Date.now() - inicio,
    });
  } catch (err) {
    console.error('Healthcheck de banco falhou:', err);
    res.status(500).json({
      status: 'erro',
      error: err.message,
      code: err.code,
      tempoMs: Date.now() - inicio,
    });
  }
});

module.exports = router;
