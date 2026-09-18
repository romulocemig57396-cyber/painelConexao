const express = require('express');
const { getPool } = require('../db');
const { buscarOrcamentosEmitiveis } = require('../queries/orcamentosEmitiveis');
const { montarUrlSap } = require('../sapUrl');
const { parseListaFiltro } = require('./queryHelpers');

const router = express.Router();

router.get('/orcamentos-emitiveis', async (req, res) => {
  try {
    const { servico, regional } = req.query;
    const servicoFiltro = parseListaFiltro(servico);
    const regionalFiltro = parseListaFiltro(regional);
    if ((servicoFiltro && servicoFiltro.length === 0) || (regionalFiltro && regionalFiltro.length === 0)) {
      return res.json({ total: 0, data: [] });
    }

    const pool = await getPool();
    const rows = await buscarOrcamentosEmitiveis(pool, { servico: servicoFiltro, regional: regionalFiltro });

    const data = rows.map((row) => ({
      ...row,
      SAP_URL: montarUrlSap(row.NUM_NOTA),
    }));

    res.json({ total: data.length, data });
  } catch (err) {
    console.error('Erro ao buscar orçamentos emitíveis:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
