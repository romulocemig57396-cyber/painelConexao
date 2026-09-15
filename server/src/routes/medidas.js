const express = require('express');
const { getPool } = require('../db');
const { buscarMedidasPendentes } = require('../queries/medidasPendentes');
const { buscarResumoMedidas } = require('../queries/medidasResumo');
const { buscarResumoGrupo2 } = require('../queries/medidasGrupo2Resumo');
const { montarUrlSap } = require('../sapUrl');
const config = require('../config');
const { parseListaFiltro } = require('./queryHelpers');

const router = express.Router();

router.get('/medidas', async (req, res) => {
  try {
    const { area, status, medidas, servico, situacao, grupo2 } = req.query;
    const medidasFiltro = parseListaFiltro(medidas);
    const servicoFiltro = parseListaFiltro(servico);
    if ((medidasFiltro && medidasFiltro.length === 0) || (servicoFiltro && servicoFiltro.length === 0)) {
      return res.json({ total: 0, regrasNegocio: config.regrasNegocio, data: [] });
    }

    const pool = await getPool();
    const rows = await buscarMedidasPendentes(pool, {
      area,
      status,
      medidas: medidasFiltro,
      servico: servicoFiltro,
      situacao,
      grupo2: grupo2 === 'SIM',
    });

    const data = rows.map((row) => ({
      ...row,
      SAP_URL: montarUrlSap(row.NUM_NOTA),
    }));

    res.json({
      total: data.length,
      regrasNegocio: config.regrasNegocio,
      data,
    });
  } catch (err) {
    console.error('Erro ao buscar medidas pendentes:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

// Contagem agrupada por COD_MEDIDA + COD_STAT_USU, mesma regra de negócio e
// mesmos filtros (area/status/medidas) de /medidas — usada pelo gráfico de barras.
router.get('/medidas/resumo', async (req, res) => {
  try {
    const { area, status, medidas, servico, situacao, grupo2 } = req.query;
    const medidasFiltro = parseListaFiltro(medidas);
    const servicoFiltro = parseListaFiltro(servico);
    if ((medidasFiltro && medidasFiltro.length === 0) || (servicoFiltro && servicoFiltro.length === 0)) {
      return res.json({ regrasNegocio: config.regrasNegocio, data: [] });
    }

    const pool = await getPool();
    const resumo = await buscarResumoMedidas(pool, {
      area,
      status,
      medidas: medidasFiltro,
      servico: servicoFiltro,
      situacao,
      grupo2: grupo2 === 'SIM',
    });

    res.json({ regrasNegocio: config.regrasNegocio, data: resumo });
  } catch (err) {
    console.error('Erro ao buscar resumo de medidas:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

// Mesma ideia de /medidas/resumo, mas agregando as medidas do GRUPO 2 — usada
// pelo segundo gráfico da aba "Gráficos" ("Medidas pendentes — Áreas envolvidas").
router.get('/medidas/resumo-grupo2', async (req, res) => {
  try {
    const { area, status, servico } = req.query;
    const servicoFiltro = parseListaFiltro(servico);
    if (servicoFiltro && servicoFiltro.length === 0) {
      return res.json({ regrasNegocio: config.regrasNegocio, data: [] });
    }
    const pool = await getPool();
    const resumo = await buscarResumoGrupo2(pool, { area, status, servico: servicoFiltro });
    res.json({ regrasNegocio: config.regrasNegocio, data: resumo });
  } catch (err) {
    console.error('Erro ao buscar resumo do grupo 2:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
