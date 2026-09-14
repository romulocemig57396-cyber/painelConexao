const express = require('express');
const { getPool } = require('../db');
const { buscarInconsistencias } = require('../queries/inconsistencias');
const { montarUrlSap } = require('../sapUrl');

const router = express.Router();

router.get('/inconsistencias', async (_req, res) => {
  try {
    const pool = await getPool();
    const rows = await buscarInconsistencias(pool);
    const data = rows.map((row) => ({
      ...row,
      SAP_URL: montarUrlSap(row.NUM_NOTA),
    }));
    res.json({ total: data.length, data });
  } catch (err) {
    console.error('Erro ao buscar inconsistências:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
