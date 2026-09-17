const { sql } = require('../db');
const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');
const { APPLY_REGULATORIO, SITUACAO_REGULATORIA } = require('./regulatorio');

/**
 * Exporta somente contagens agregadas das medidas pendentes. A CTE de notas
 * normaliza o código de local uma única vez e serve de base para os dois
 * grupos exibidos no painel público.
 */
async function buscarResumoMedidasPublico(
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

  const result = await request.query(`
    WITH NOTAS_REGIONAIS AS (
      SELECT N.NUM_NOTA, N.COD_SERVICO, N.DES_MERCADO AS MERCADO, L.COD_SP AS REGIONAL
      FROM TBL_NOTAS N
      LEFT JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
      WHERE N.COD_SERVICO IN (${servicoInClause})
        AND L.COD_SP IN (${regionalInClause})
    ),
    MEDIDAS_PENDENTES AS (
      SELECT M.NUM_NOTA, M.COD_MEDIDA, N.COD_SERVICO, N.MERCADO,
        COALESCE(R.REGIONAL_REGULATORIA, N.REGIONAL) AS REGIONAL,
        ${SITUACAO_REGULATORIA} AS DES_SITUACAO
      FROM TBL_MEDIDAS M
      INNER JOIN NOTAS_REGIONAIS N ON N.NUM_NOTA = M.NUM_NOTA
      ${APPLY_REGULATORIO}
      WHERE M.COD_STAT_USU IN (${statusInClause})
    )
    SELECT
      'GRUPO1' AS GRUPO,
      COD_SERVICO AS SERVICO,
      MERCADO,
      REGIONAL,
      COD_MEDIDA,
      CASE WHEN COD_MEDIDA = '0019' THEN 'PENDENTES' ELSE DES_SITUACAO END AS DES_SITUACAO,
      COUNT(*) AS QUANTIDADE
    FROM MEDIDAS_PENDENTES
    WHERE COD_MEDIDA IN (${grupo1InClause})
    GROUP BY COD_SERVICO, MERCADO, REGIONAL, COD_MEDIDA,
      CASE WHEN COD_MEDIDA = '0019' THEN 'PENDENTES' ELSE DES_SITUACAO END

    UNION ALL

    SELECT
      'GRUPO2' AS GRUPO,
      M.COD_SERVICO AS SERVICO,
      M.MERCADO,
      M.REGIONAL,
      M.COD_MEDIDA,
      M.DES_SITUACAO,
      COUNT(*) AS QUANTIDADE
    FROM MEDIDAS_PENDENTES M
    WHERE M.COD_MEDIDA IN (${grupo2InClause})
      AND EXISTS (
        SELECT 1
        FROM MEDIDAS_PENDENTES M1
        WHERE M1.NUM_NOTA = M.NUM_NOTA
          AND M1.COD_MEDIDA IN (${grupo1InClause})
      )
    GROUP BY M.COD_SERVICO, M.MERCADO, M.REGIONAL, M.COD_MEDIDA, M.DES_SITUACAO
    ORDER BY GRUPO, SERVICO, REGIONAL, COD_MEDIDA, DES_SITUACAO;
  `);

  return result.recordset;
}

module.exports = { buscarResumoMedidasPublico };
