const { sql } = require('../db');
const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');

/**
 * Mesma regra de negócio de buscarMedidasPendentes (grupo1/status/COD_SERVICO,
 * com os mesmos filtros opcionais de area/status/medidas/situacao/grupo2), mas
 * agregada por COD_MEDIDA + COD_STAT_USU — usada pelo gráfico de barras da aba
 * "Gráficos". O LEFT JOIN do grupo 2 só existe pra suportar o filtro "grupo2"
 * (atalho do card "Com pendência grupo 2"); a contagem em si não sinaliza grupo 2.
 */
async function buscarResumoMedidas(pool, filtros = {}) {
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
  if (filtros.grupo2) {
    extraWhere += ' AND P.MEDIDAS_PENDENTES IS NOT NULL';
  }

  const query = `
    SELECT
        M.COD_MEDIDA,
        M.COD_STAT_USU,
        COUNT(*) AS QUANTIDADE
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
    GROUP BY
        M.COD_MEDIDA, M.COD_STAT_USU
    ORDER BY
        M.COD_MEDIDA, M.COD_STAT_USU;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarResumoMedidas };
