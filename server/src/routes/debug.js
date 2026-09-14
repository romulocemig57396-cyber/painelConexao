const express = require('express');
const { getPool } = require('../db');
const { buscarMedidasSimples } = require('../queries/medidasSimples');

const router = express.Router();

// Rota temporária de debug: só o filtro principal (grupo 1), sem o LEFT JOIN/STRING_AGG
// do grupo 2. Remover (ou deixar de usar) depois que a query completa em /api/medidas
// estiver validada.
router.get('/debug/medidas-simples', async (_req, res) => {
  try {
    const pool = await getPool();
    const rows = await buscarMedidasSimples(pool);
    res.json({ total: rows.length, data: rows });
  } catch (err) {
    console.error('Debug medidas-simples falhou:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
