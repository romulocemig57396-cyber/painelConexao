const express = require('express');
const { getPool } = require('../db');
const { buscarUltimaAtualizacao } = require('../queries/ultimaAtualizacao');

const router = express.Router();

router.get('/ultima-atualizacao', async (_req, res) => {
  try {
    const pool = await getPool();
    const registro = await buscarUltimaAtualizacao(pool);
    res.json({ data: registro });
  } catch (err) {
    console.error('Erro ao buscar última atualização do banco:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
