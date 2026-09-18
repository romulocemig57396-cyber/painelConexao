const { sql } = require('../db');
const config = require('../config');
const { inClauseParams, campoNaoContemPalavra, campoIgual, medidaCasePorServico } = require('./sqlHelpers');
const { MAPEAMENTO_MEDIDA_POR_SERVICO } = require('./mapeamentoMedidaServico');

/**
 * Histórico mensal de universalização de obras: notas com a medida "com
 * obras" não cancelada, categorizadas pelo COD_UNIVERSALIZACAO da nota em 3
 * grupos (universalizadaCodigos, naoUniversalizadaCodigos, e OUTROS pra
 * qualquer outro código ou nulo/vazio).
 *
 * "Com obras" varia por serviço (0590 pra maioria, 0591 pra PSAA/PSAI — ver
 * mapeamentoMedidaServico.js), resolvido por LINHA via medidaCasePorServico,
 * já que o filtro de serviço pode combinar vários serviços na mesma consulta.
 *
 * filtros.servico/filtros.mercado: ver comentário em historicoAprovacao.js.
 */
async function buscarHistoricoUniversalizacao(pool, filtros = {}) {
  const { statusCancelado, codServicoFiltro, dataMinima, universalizacao } = config.regrasHistorico;
  const { universalizadaCodigos, naoUniversalizadaCodigos, foraUniversalizacaoCodigos, segurancaCodigos } = universalizacao;
  const servicos = filtros.servico?.length ? filtros.servico : codServicoFiltro;
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const medComObrasCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'comObras', 'comObras', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );
  const universalizadaInClause = inClauseParams(request, 'univ_', universalizadaCodigos);
  const naoUniversalizadaInClause = inClauseParams(request, 'naoUniv_', naoUniversalizadaCodigos);
  const foraUniversalizacaoInClause = inClauseParams(request, 'foraUniv_', foraUniversalizacaoCodigos);
  const segurancaInClause = inClauseParams(request, 'seg_', segurancaCodigos);
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;
  const condNaoCancelado = campoNaoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);
  const condMercado = filtros.mercado
    ? campoIgual('N.DES_MERCADO', request, 'mercado', filtros.mercado)
    : '1=1';
  const condRegional = regionalInClause ? `AND L.COD_SP IN (${regionalInClause})` : '';

  const query = `
    SELECT MES, CATEGORIA, COUNT(*) AS QTD
    FROM (
        SELECT
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            CASE
                WHEN N.COD_UNIVERSALIZACAO IN (${universalizadaInClause}) THEN 'UNIVERSALIZADA'
                WHEN N.COD_UNIVERSALIZACAO IN (${naoUniversalizadaInClause}) THEN 'NAO_UNIVERSALIZADA'
                WHEN N.COD_UNIVERSALIZACAO IN (${foraUniversalizacaoInClause}) THEN 'FORA_UNIVERSALIZACAO'
                WHEN N.COD_UNIVERSALIZACAO IN (${segurancaInClause}) THEN 'SEGURANCA'
                ELSE 'OUTROS'
            END AS CATEGORIA
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE M.COD_MEDIDA = ${medComObrasCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condNaoCancelado}
          AND ${condMercado}
          ${condRegional}
    ) X
    GROUP BY MES, CATEGORIA
    ORDER BY MES, CATEGORIA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

/**
 * Versão sem filtro pra exportação (ver comentário equivalente em
 * historicoAprovacao.js) — agrupa também por serviço/mercado/regional em vez
 * de só somar dentro do recorte pedido.
 */
async function buscarHistoricoUniversalizacaoGranular(pool) {
  const { statusCancelado, servicosDisponiveis, dataMinima, universalizacao } = config.regrasHistorico;
  const { universalizadaCodigos, naoUniversalizadaCodigos, foraUniversalizacaoCodigos, segurancaCodigos } = universalizacao;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const medComObrasCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'comObras', 'comObras', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );
  const universalizadaInClause = inClauseParams(request, 'univ_', universalizadaCodigos);
  const naoUniversalizadaInClause = inClauseParams(request, 'naoUniv_', naoUniversalizadaCodigos);
  const foraUniversalizacaoInClause = inClauseParams(request, 'foraUniv_', foraUniversalizacaoCodigos);
  const segurancaInClause = inClauseParams(request, 'seg_', segurancaCodigos);
  const servicoInClause = inClauseParams(request, 'sv_', servicosDisponiveis);
  const condNaoCancelado = campoNaoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);

  const query = `
    SELECT MES, SERVICO, MERCADO, REGIONAL, CATEGORIA, COUNT(*) AS QTD
    FROM (
        SELECT
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            N.COD_SERVICO AS SERVICO,
            N.DES_MERCADO AS MERCADO,
            L.COD_SP AS REGIONAL,
            CASE
                WHEN N.COD_UNIVERSALIZACAO IN (${universalizadaInClause}) THEN 'UNIVERSALIZADA'
                WHEN N.COD_UNIVERSALIZACAO IN (${naoUniversalizadaInClause}) THEN 'NAO_UNIVERSALIZADA'
                WHEN N.COD_UNIVERSALIZACAO IN (${foraUniversalizacaoInClause}) THEN 'FORA_UNIVERSALIZACAO'
                WHEN N.COD_UNIVERSALIZACAO IN (${segurancaInClause}) THEN 'SEGURANCA'
                ELSE 'OUTROS'
            END AS CATEGORIA
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE M.COD_MEDIDA = ${medComObrasCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condNaoCancelado}
    ) X
    GROUP BY MES, SERVICO, MERCADO, REGIONAL, CATEGORIA
    ORDER BY MES, SERVICO, MERCADO, REGIONAL, CATEGORIA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarHistoricoUniversalizacao, buscarHistoricoUniversalizacaoGranular };
