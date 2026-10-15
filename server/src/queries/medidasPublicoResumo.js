const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');
const { APPLY_REGULATORIO, SITUACAO_REGULATORIA, SITUACAO_MEDIDA_GRUPO2 } = require('./regulatorio');
const { JOIN_TIPO_SOLICITACAO, COLUNAS_SOLICITACAO } = require('./tipoSolicitacao');

/**
 * Exporta somente contagens agregadas das medidas pendentes. A CTE de notas
 * normaliza o código de local uma única vez e serve de base para os dois
 * grupos exibidos no painel público.
 */
function prepararCtesPublico(
  pool,
  servicos = config.regrasNegocio.codServicoFiltro,
  regionais = config.regrasHistorico.regionaisDisponiveis,
) {
  const { grupo1Medidas, grupo2Medidas, statusPendente } = config.regrasNegocio;
  const request = pool.request();
  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const grupo2InClause = inClauseParams(request, 'g2_', grupo2Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const regionalInClause = inClauseParams(request, 'rg_', regionais);

  const ctes = `
    WITH NOTAS_REGIONAIS AS (
      SELECT N.NUM_NOTA, N.COD_SERVICO, N.DES_MERCADO AS MERCADO, L.COD_SP AS REGIONAL,
        ${COLUNAS_SOLICITACAO}
      FROM TBL_NOTAS N
      ${JOIN_TIPO_SOLICITACAO}
      LEFT JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
      WHERE N.COD_SERVICO IN (${servicoInClause})
        AND L.COD_SP IN (${regionalInClause})
    ),
    MEDIDAS_PENDENTES AS (
      SELECT M.NUM_NOTA, M.COD_MEDIDA, N.COD_SERVICO, N.MERCADO, N.TIPO_SOLICITACAO, N.CLASSE, N.FAIXA_CAIXAS,
        COALESCE(R.REGIONAL_REGULATORIA, N.REGIONAL) AS REGIONAL,
        ${SITUACAO_REGULATORIA} AS SITUACAO_REGULATORIA,
        ${SITUACAO_MEDIDA_GRUPO2} AS SITUACAO_MEDIDA
      FROM TBL_MEDIDAS M
      INNER JOIN NOTAS_REGIONAIS N ON N.NUM_NOTA = M.NUM_NOTA
      ${APPLY_REGULATORIO}
      WHERE M.COD_STAT_USU IN (${statusInClause})
    )`;

  return { request, ctes, grupo1InClause, grupo2InClause };
}

async function buscarResumoMedidasPublico(pool, servicos, regionais) {
  const { request, ctes, grupo1InClause, grupo2InClause } = prepararCtesPublico(pool, servicos, regionais);

  const result = await request.query(`
    ${ctes}
    SELECT
      'GRUPO1' AS GRUPO,
      COD_SERVICO AS SERVICO,
      MERCADO,
      REGIONAL,
      TIPO_SOLICITACAO,
      CLASSE,
      FAIXA_CAIXAS,
      COD_MEDIDA,
      SITUACAO_REGULATORIA AS DES_SITUACAO,
      COUNT(*) AS QUANTIDADE
    FROM MEDIDAS_PENDENTES
    WHERE COD_MEDIDA IN (${grupo1InClause})
    GROUP BY COD_SERVICO, MERCADO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, COD_MEDIDA, SITUACAO_REGULATORIA

    UNION ALL

    SELECT
      'GRUPO2' AS GRUPO,
      M.COD_SERVICO AS SERVICO,
      M.MERCADO,
      M.REGIONAL,
      M.TIPO_SOLICITACAO,
      M.CLASSE,
      M.FAIXA_CAIXAS,
      M.COD_MEDIDA,
      SITUACAO_MEDIDA AS DES_SITUACAO,
      COUNT(*) AS QUANTIDADE
    FROM MEDIDAS_PENDENTES M
    WHERE M.COD_MEDIDA IN (${grupo2InClause})
      AND EXISTS (
        SELECT 1
        FROM MEDIDAS_PENDENTES M1
        WHERE M1.NUM_NOTA = M.NUM_NOTA
          AND M1.COD_MEDIDA IN (${grupo1InClause})
      )
    GROUP BY M.COD_SERVICO, M.MERCADO, M.REGIONAL, M.TIPO_SOLICITACAO, M.CLASSE, M.FAIXA_CAIXAS, M.COD_MEDIDA, SITUACAO_MEDIDA
    ORDER BY GRUPO, SERVICO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, COD_MEDIDA, DES_SITUACAO;
  `);

  return result.recordset;
}

/**
 * Valor total da obra (TBL_OBRA_CUSTOS.VAL_TOTAL_OBRA) das notas com medida do
 * grupo 1 pendente — as mesmas do gráfico principal de Medidas Pendentes —,
 * agrupado pelas dimensões dos filtros do painel externo. Cada nota conta uma
 * vez só (DISTINCT, as dimensões são todas da nota); valor nulo ou não
 * positivo não entra na soma.
 */
async function buscarValorObraPublico(pool, servicos, regionais) {
  const { request, ctes, grupo1InClause } = prepararCtesPublico(pool, servicos, regionais);

  const result = await request.query(`
    ${ctes}
    SELECT
      D.COD_SERVICO AS SERVICO,
      D.MERCADO,
      D.REGIONAL,
      D.TIPO_SOLICITACAO,
      D.CLASSE,
      D.FAIXA_CAIXAS,
      COUNT(*) AS NOTAS,
      SUM(CASE WHEN C.VAL_TOTAL_OBRA > 0 THEN C.VAL_TOTAL_OBRA END) AS VALOR_OBRA
    FROM (
      SELECT DISTINCT NUM_NOTA, COD_SERVICO, MERCADO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS
      FROM MEDIDAS_PENDENTES
      WHERE COD_MEDIDA IN (${grupo1InClause})
    ) D
    LEFT JOIN TBL_OBRA_CUSTOS C ON C.COD_NOTA = D.NUM_NOTA
    GROUP BY D.COD_SERVICO, D.MERCADO, D.REGIONAL, D.TIPO_SOLICITACAO, D.CLASSE, D.FAIXA_CAIXAS
    ORDER BY SERVICO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS;
  `);

  return result.recordset;
}

module.exports = { buscarResumoMedidasPublico, buscarValorObraPublico };
