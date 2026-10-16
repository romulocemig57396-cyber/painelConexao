const { sql } = require('../db');
const config = require('../config');
const { inClauseParams, campoNaoContemPalavra, campoIgual, medidaCasePorServico } = require('./sqlHelpers');
const { MAPEAMENTO_MEDIDA_POR_SERVICO } = require('./mapeamentoMedidaServico');
const { JOIN_TIPO_SOLICITACAO, COLUNAS_SOLICITACAO, universalizacaoCase, condFiltrosSolicitacao } = require('./tipoSolicitacao');
const { DIMENSOES_FILTROS, consultaValorObra, totalValorObra } = require('./valorObra');

/**
 * Histórico mensal de universalização de obras: notas com a medida "com
 * obras" não cancelada, categorizadas pelo COD_UNIVERSALIZACAO da nota nas 5
 * categorias de universalizacaoCase() (tipoSolicitacao.js) — a mesma expressão
 * do filtro "Universalização", pra gráfico e filtro nunca divergirem. Qualquer
 * código fora das listas configuradas (ou nulo/vazio) cai em OUTROS.
 *
 * "Com obras" varia por serviço (0590 pra maioria, 0591 pra PSAA/PSAI — ver
 * mapeamentoMedidaServico.js), resolvido por LINHA via medidaCasePorServico,
 * já que o filtro de serviço pode combinar vários serviços na mesma consulta.
 *
 * filtros.servico/filtros.mercado: ver comentário em historicoAprovacao.js.
 */
async function buscarHistoricoUniversalizacao(pool, filtros = {}, { valorObra = false } = {}) {
  const { statusCancelado, codServicoFiltro, dataMinima } = config.regrasHistorico;
  const servicos = filtros.servico?.length ? filtros.servico : codServicoFiltro;
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const medComObrasCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'comObras', 'comObras', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );
  const categoriaUniversalizacao = universalizacaoCase(request);
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;
  const condNaoCancelado = campoNaoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);
  const condMercado = filtros.mercado
    ? campoIgual('N.DES_MERCADO', request, 'mercado', filtros.mercado)
    : '1=1';
  const condRegional = regionalInClause ? `AND L.COD_SP IN (${regionalInClause})` : '';
  const condTipo = condFiltrosSolicitacao(request, filtros);

  const interna = `
        SELECT
            N.NUM_NOTA,
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            ${categoriaUniversalizacao} AS CATEGORIA
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        ${JOIN_TIPO_SOLICITACAO}
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE M.COD_MEDIDA = ${medComObrasCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condNaoCancelado}
          AND ${condMercado}
          ${condRegional}
          ${condTipo}
`;

  const query = valorObra
    ? consultaValorObra(interna, 'CATEGORIA')
    : `
    SELECT MES, CATEGORIA, COUNT(*) AS QTD
    FROM (${interna}
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
async function buscarHistoricoUniversalizacaoGranular(pool, { valorObra = false } = {}) {
  const { statusCancelado, servicosDisponiveis, dataMinima } = config.regrasHistorico;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const medComObrasCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'comObras', 'comObras', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );
  const categoriaUniversalizacao = universalizacaoCase(request);
  const servicoInClause = inClauseParams(request, 'sv_', servicosDisponiveis);
  const condNaoCancelado = campoNaoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);

  const interna = `
        SELECT
            N.NUM_NOTA,
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            N.COD_SERVICO AS SERVICO,
            N.DES_MERCADO AS MERCADO,
            L.COD_SP AS REGIONAL,
            ${COLUNAS_SOLICITACAO},
            ${categoriaUniversalizacao} AS CATEGORIA
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        ${JOIN_TIPO_SOLICITACAO}
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE M.COD_MEDIDA = ${medComObrasCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condNaoCancelado}
`;

  const query = valorObra
    ? consultaValorObra(interna, 'CATEGORIA', DIMENSOES_FILTROS)
    : `
    SELECT MES, SERVICO, MERCADO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, CATEGORIA, COUNT(*) AS QTD
    FROM (${interna}
    ) X
    GROUP BY MES, SERVICO, MERCADO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, CATEGORIA
    ORDER BY MES, SERVICO, MERCADO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, CATEGORIA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

/** Valor da obra das notas do gráfico (um total só), com os mesmos filtros de buscarHistoricoUniversalizacao. */
async function buscarValorObraUniversalizacao(pool, filtros = {}) {
  return totalValorObra(await buscarHistoricoUniversalizacao(pool, filtros, { valorObra: true }));
}

/** Valor da obra por combinação dos filtros do painel externo (exportação). */
function buscarValorObraUniversalizacaoGranular(pool) {
  return buscarHistoricoUniversalizacaoGranular(pool, { valorObra: true });
}

module.exports = {
  buscarHistoricoUniversalizacao,
  buscarHistoricoUniversalizacaoGranular,
  buscarValorObraUniversalizacao,
  buscarValorObraUniversalizacaoGranular,
};
