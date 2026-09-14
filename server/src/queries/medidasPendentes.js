const { sql } = require('../db');
const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');

/**
 * Monta e executa a query de medidas pendentes (grupo 1) com sinalização de grupo 2,
 * usando os grupos/status/COD_SERVICO configuráveis em config.js (.env).
 * Filtros opcionais (area, status) são aplicados como AND adicionais sobre o resultado base.
 * filtros.medidas, se informado (array não vazio), substitui o grupo 1 configurado —
 * usado pelo filtro multi-select de COD_MEDIDA no frontend.
 */
async function buscarMedidasPendentes(pool, filtros = {}) {
  const { grupo1Medidas: grupo1Padrao, grupo2Medidas, statusPendente, codServicoFiltro } = config.regrasNegocio;
  const grupo1Medidas = filtros.medidas && filtros.medidas.length ? filtros.medidas : grupo1Padrao;

  const request = pool.request();

  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const grupo2InClause = inClauseParams(request, 'g2_', grupo2Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const servicoInClause = inClauseParams(request, 'sv_', codServicoFiltro);

  let extraWhere = '';
  if (filtros.area) {
    request.input('filtroArea', sql.NVarChar, filtros.area);
    extraWhere += ' AND M.COD_AREA_RESP = @filtroArea';
  }
  if (filtros.status) {
    request.input('filtroStatus', sql.NVarChar, filtros.status);
    extraWhere += ' AND M.COD_STAT_USU = @filtroStatus';
  }
  if (filtros.situacao) {
    request.input('filtroSituacao', sql.NVarChar, filtros.situacao);
    extraWhere += ' AND M.DES_SITUACAO = @filtroSituacao';
  }
  // "Com pendência grupo 2" reaproveita o mesmo P (LEFT JOIN) já usado pra
  // calcular TEM_PENDENCIA_GRUPO2 — atalho do card de métrica.
  if (filtros.grupo2) {
    extraWhere += ' AND P.MEDIDAS_PENDENTES IS NOT NULL';
  }

  const query = `
    SELECT
        N.NUM_NOTA,
        N.COD_SERVICO,
        N.DES_SERVICO,
        N.DES_OBRA,
        N.DES_ENDERECO_OBRA,
        N.DAT_CRIACAO    AS DATA_CRIACAO_NOTA,
        M.COD_MEDIDA,
        M.COD_STAT_USU,
        M.DAT_SOLIC      AS DATA_CRIACAO_MEDIDA,
        M.DAT_TPREV      AS DATA_VENCIMENTO,
        M.DAT_TREAL      AS DATA_CONCLUSAO_REAL,
        M.COD_AREA_RESP,
        M.DES_SITUACAO,
        M.DES_SITUACAO2,
        CASE WHEN P.MEDIDAS_PENDENTES IS NOT NULL THEN 'SIM' ELSE 'NAO' END AS TEM_PENDENCIA_GRUPO2,
        P.MEDIDAS_PENDENTES AS MEDIDAS_PENDENTES_GRUPO2
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N
        ON M.NUM_NOTA = N.NUM_NOTA
    LEFT JOIN (
        SELECT
            M2.NUM_NOTA,
            STRING_AGG(M2.COD_MEDIDA, ', ') AS MEDIDAS_PENDENTES
        FROM TBL_MEDIDAS M2
        WHERE M2.COD_MEDIDA IN (${grupo2InClause})
          AND M2.COD_STAT_USU IN (${statusInClause})
        GROUP BY M2.NUM_NOTA
    ) P ON P.NUM_NOTA = M.NUM_NOTA
    WHERE
        M.COD_MEDIDA IN (${grupo1InClause})
        AND M.COD_STAT_USU IN (${statusInClause})
        AND N.COD_SERVICO IN (${servicoInClause})
        ${extraWhere}
    ORDER BY
        N.NUM_NOTA, M.DAT_TPREV ASC;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarMedidasPendentes };
