const express = require('express');
const { getPool } = require('../db');
const { buscarHistoricoAprovacao, buscarValorObraAprovacao } = require('../queries/historicoAprovacao');
const { buscarHistoricoLiberacao, buscarValorObraLiberacao } = require('../queries/historicoLiberacao');
const { buscarHistoricoProdutividade, buscarValorObraProdutividade } = require('../queries/historicoProdutividade');
const { buscarHistoricoUniversalizacao, buscarValorObraUniversalizacao } = require('../queries/historicoUniversalizacao');
const config = require('../config');
const { parseListaFiltro, validarEnum, validarListaEnum } = require('./queryHelpers');

const router = express.Router();

// servico/mercado ausentes => undefined, mantendo o comportamento padrão
// (COMT, sem filtro de mercado) idêntico ao de antes desses filtros existirem.
// servico agora é lista (?servico=COMT,COBT,PSAA,...) pra permitir somar
// múltiplos códigos no mesmo gráfico; mercado continua único (só 2 valores
// possíveis, "ambos" já é só omitir o filtro).
function lerFiltrosComuns(req) {
  const { servico, mercado, regional, tipoSolicitacao, classe, faixaCaixas } = req.query;
  return {
    servico: validarListaEnum(servico, config.regrasHistorico.servicosDisponiveis, 'servico'),
    mercado: validarEnum(mercado, config.regrasHistorico.mercadosDisponiveis, 'mercado'),
    regional: validarListaEnum(regional, config.regrasHistorico.regionaisDisponiveis, 'regional'),
    tipoSolicitacao: validarListaEnum(tipoSolicitacao, config.regrasHistorico.tiposSolicitacaoDisponiveis, 'tipoSolicitacao'),
    classe: validarListaEnum(classe, config.regrasHistorico.classesDisponiveis, 'classe'),
    faixaCaixas: validarListaEnum(faixaCaixas, config.regrasHistorico.faixasCaixasDisponiveis, 'faixaCaixas'),
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

function tipoSolicitacaoVazio(filtros) {
  return [filtros.tipoSolicitacao, filtros.classe, filtros.faixaCaixas].some((lista) => lista !== undefined && lista.length === 0);
}

router.get('/historico/aprovacao', async (req, res) => {
  try {
    const filtros = lerFiltrosComuns(req);
    if (servicoVazio(filtros) || regionalVazia(filtros) || tipoSolicitacaoVazio(filtros)) return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
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
    if (servicoVazio(filtros) || regionalVazia(filtros) || tipoSolicitacaoVazio(filtros)) return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
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
    if (servicoVazio(filtros) || regionalVazia(filtros) || tipoSolicitacaoVazio(filtros)) return res.json({ regrasNegocio: config.regrasHistorico, data: [] });
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
    if (servicoVazio(filtros) || regionalVazia(filtros) || tipoSolicitacaoVazio(filtros) || (medidasFiltro && medidasFiltro.length === 0)) {
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

// Valor da obra (uma vez por nota) das notas de cada gráfico do histórico, com os
// mesmos filtros dos gráficos — um card por gráfico. A produtividade também
// respeita o filtro próprio de medida (?medidas=).
router.get('/historico/valor-obra', async (req, res) => {
  const zerado = { notas: 0, valorObra: 0 };
  try {
    const filtros = lerFiltrosComuns(req);
    const medidasFiltro = parseListaFiltro(req.query.medidas);
    if (servicoVazio(filtros) || regionalVazia(filtros) || tipoSolicitacaoVazio(filtros)) {
      return res.json({
        data: { aprovacao: zerado, liberacao: zerado, universalizacao: zerado, produtividade: zerado },
      });
    }

    const pool = await getPool();
    const [aprovacao, liberacao, universalizacao, produtividade] = await Promise.all([
      buscarValorObraAprovacao(pool, filtros),
      buscarValorObraLiberacao(pool, filtros),
      buscarValorObraUniversalizacao(pool, filtros),
      medidasFiltro && medidasFiltro.length === 0
        ? zerado
        : buscarValorObraProdutividade(pool, { ...filtros, medidas: medidasFiltro }),
    ]);
    res.json({ data: { aprovacao, liberacao, universalizacao, produtividade } });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error('Erro ao buscar valor da obra do histórico:', err);
    res.status(500).json({ error: 'Falha ao consultar o banco de dados', detail: err.message });
  }
});

module.exports = router;
