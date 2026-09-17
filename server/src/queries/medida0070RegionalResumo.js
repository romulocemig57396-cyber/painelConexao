const { sql } = require('../db');
const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');
const { APPLY_REGULATORIO, SITUACAO_REGULATORIA } = require('./regulatorio');

async function buscarResumoMedida0070Regional(pool, filtros = {}) {
  const { grupo1Medidas, statusPendente, codServicoFiltro: servicosPadrao } = config.regrasNegocio;
  const servicos = filtros.servico?.length ? filtros.servico : servicosPadrao;
  const regionais = filtros.regional?.length ? filtros.regional : null;
  const request = pool.request();
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;

  const filtrosExtras = regionalInClause
    ? `AND COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP) IN (${regionalInClause})`
    : '';
  const query = `
    SELECT
        COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP) AS REGIONAL,
        ${SITUACAO_REGULATORIA} AS DES_SITUACAO,
        COUNT(*) AS QUANTIDADE
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    INNER JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
    ${APPLY_REGULATORIO}
    WHERE M.COD_MEDIDA = '0070'
      AND M.COD_STAT_USU IN (${statusInClause})
      AND N.COD_SERVICO IN (${servicoInClause})
      AND EXISTS (
        SELECT 1
        FROM TBL_MEDIDAS M1
        WHERE M1.NUM_NOTA = M.NUM_NOTA
          AND M1.COD_MEDIDA IN (${grupo1InClause})
          AND M1.COD_STAT_USU IN (${statusInClause})
      )
      ${filtrosExtras}
    GROUP BY COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP), ${SITUACAO_REGULATORIA}
    ORDER BY REGIONAL, DES_SITUACAO;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarResumoMedida0070Regional };
