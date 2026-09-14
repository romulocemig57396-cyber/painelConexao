const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');

/**
 * Versão de debug da query principal: só TBL_MEDIDAS + TBL_NOTAS com o filtro
 * do grupo 1, SEM o LEFT JOIN/STRING_AGG do grupo 2. Usar para validar o filtro
 * principal isoladamente antes de testar a query completa.
 */
async function buscarMedidasSimples(pool) {
  const { grupo1Medidas, statusPendente, codServicoFiltro } = config.regrasNegocio;

  const request = pool.request();

  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const servicoInClause = inClauseParams(request, 'sv_', codServicoFiltro);

  const query = `
    SELECT
        N.NUM_NOTA,
        N.COD_SERVICO,
        N.DES_SERVICO,
        N.DES_OBRA,
        N.DES_ENDERECO_OBRA,
        M.COD_MEDIDA,
        M.COD_STAT_USU,
        M.DAT_SOLIC      AS DATA_CRIACAO_MEDIDA,
        M.DAT_TPREV      AS DATA_VENCIMENTO,
        M.DAT_TREAL      AS DATA_CONCLUSAO_REAL,
        M.COD_AREA_RESP,
        M.DES_SITUACAO,
        M.DES_SITUACAO2
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N
        ON M.NUM_NOTA = N.NUM_NOTA
    WHERE
        M.COD_MEDIDA IN (${grupo1InClause})
        AND M.COD_STAT_USU IN (${statusInClause})
        AND N.COD_SERVICO IN (${servicoInClause})
    ORDER BY
        N.NUM_NOTA, M.DAT_TPREV ASC;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarMedidasSimples };
