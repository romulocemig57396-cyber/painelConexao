const express = require('express');
const { getPool } = require('../db');
const { buscarHistoricoAprovacao } = require('../queries/historicoAprovacao');
const { buscarHistoricoLiberacao } = require('../queries/historicoLiberacao');
const { buscarHistoricoProdutividade } = require('../queries/historicoProdutividade');
const { buscarHistoricoUniversalizacao } = require('../queries/historicoUniversalizacao');
const config = require('../config');
const { parseListaFiltro, validarEnum, validarListaEnum } = require('./queryHelpers');

const router = express.Router();

// servico/mercado ausentes => undefined, mantendo o comportamento padrão
// (COMT, sem filtro de mercado) idêntico ao de antes desses filtros existirem.
// servico agora é lista (?servico=COMT,COBT,PSAA,...) pra permitir somar
// múltiplos códigos no mesmo gráfico; mercado continua único (só 2 valores
// possíveis, "ambos" já é só omitir o filtro).
function lerFiltrosComuns(req) {
  const { servico, mercado, regional } = req.query;
  return {
    servico: validarListaEnum(servico, config.regrasHistorico.servicosDisponiveis, 'servico'),
    mercado: validarEnum(mercado, config.regrasHistorico.mercadosDisponiveis, 'mercado'),
    regional: validarListaEnum(regional, config.regrasHistorico.regionaisDisponiveis, 'regional'),
  };
}

// Usuário desmarcou todos os serviços -> lista vazia explícita, diferente de
// "não filtrar" (ausente). COD_SERVICO IN () é inválido em T-SQL, então
// responde vazio sem consultar o banco (mesmo tratamento do medidasFiltro
// em /historico/produtividade).
function servicoVazio(filtros) {
  return filtros.servico !== undefined && filtros.servico.length === 0;
}

function regionalVazia(filtros) {
  return filtros.regional !== undefined && filtros.regional.length === 0;
}

router.get('/historico/aprovacao', async (req, res) => {
  try {
    const filtros = lerFiltrosComuns(req);
    if (servicoVazio(filtros) || regionalVazia(filtros)) return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
    const pool = await getPool();
    const data = await buscarHistoricoAprovacao(pool, filtros);
    res.json({ regrasNegocio: config.regrasHistorico, data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error('Erro ao buscar histórico de aprovação:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

router.get('/historico/liberacao', async (req, res) => {
  try {
    const filtros = lerFiltrosComuns(req);
    if (servicoVazio(filtros) || regionalVazia(filtros)) return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
    const pool = await getPool();
    const data = await buscarHistoricoLiberacao(pool, filtros);
    res.json({ regrasNegocio: config.regrasHistorico, data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error('Erro ao buscar histórico de liberação:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

router.get('/historico/universalizacao', async (req, res) => {
  try {
    const filtros = lerFiltrosComuns(req);
    if (servicoVazio(filtros) || regionalVazia(filtros)) return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
    const pool = await getPool();
    const data = await buscarHistoricoUniversalizacao(pool, filtros);
    res.json({ regrasNegocio: config.regrasHistorico, data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error('Erro ao buscar histórico de universalização:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

router.get('/historico/produtividade', async (req, res) => {
  try {
    const filtros = lerFiltrosComuns(req);
    const medidasFiltro = parseListaFiltro(req.query.medidas);
    if (servicoVazio(filtros) || regionalVazia(filtros) || (medidasFiltro && medidasFiltro.length === 0)) {
      return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
    }

    const pool = await getPool();
    const data = await buscarHistoricoProdutividade(pool, { ...filtros, medidas: medidasFiltro });
    res.json({ regrasNegocio: config.regrasHistorico, data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error('Erro ao buscar histórico de produtividade:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
