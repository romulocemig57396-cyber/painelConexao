const { sql } = require('../db');
const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');
const { APPLY_REGULATORIO, SITUACAO_REGULATORIA } = require('./regulatorio');

/**
 * Mesmo padrão de buscarResumoMedidas, mas agregando as medidas do GRUPO 2
 * (config.regrasNegocio.grupo2Medidas) em vez do grupo 1 — usada pelo segundo
 * gráfico de barras ("Medidas pendentes — Áreas envolvidas") na aba "Gráficos".
 * Só conta medidas do grupo 2 em notas que TAMBÉM têm alguma medida do grupo 1
 * pendente (mesmo EXISTS que a regra de negócio original usa pra decidir
 * TEM_PENDENCIA_GRUPO2) — sem isso a contagem incluiria grupo 2 solto, fora do
 * escopo de notas já filtradas pelo grupo 1.
 * Aceita os mesmos filtros opcionais de area/status da dropdown (não faz sentido
 * "medidas" aqui, já que os códigos do grupo 2 não são escolhidos pelo usuário).
 */
async function buscarResumoGrupo2(pool, filtros = {}) {
  const {
    grupo1Medidas,
    grupo2Medidas,
    statusPendente,
    codServicoFiltro: servicosPadrao,
  } = config.regrasNegocio;
  const codServicoFiltro = filtros.servico?.length ? filtros.servico : servicosPadrao;
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();

  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const grupo2InClause = inClauseParams(request, 'g2_', grupo2Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const servicoInClause = inClauseParams(request, 'sv_', codServicoFiltro);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;

  let extraWhere = '';
  if (filtros.area) {
    request.input('filtroArea', sql.NVarChar, filtros.area);
    extraWhere += ' AND M.COD_AREA_RESP = @filtroArea';
  }
  if (filtros.status) {
    request.input('filtroStatus', sql.NVarChar, filtros.status);
    extraWhere += ' AND M.COD_STAT_USU = @filtroStatus';
  }
  if (regionalInClause) {
    extraWhere += ` AND COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP) IN (${regionalInClause})`;
  }

  const query = `
    SELECT
        M.COD_MEDIDA,
        ${SITUACAO_REGULATORIA} AS DES_SITUACAO,
        COUNT(*) AS QUANTIDADE
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N
        ON M.NUM_NOTA = N.NUM_NOTA
    LEFT JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
    ${APPLY_REGULATORIO}
    WHERE
        M.COD_MEDIDA IN (${grupo2InClause})
        AND M.COD_STAT_USU IN (${statusInClause})
        AND N.COD_SERVICO IN (${servicoInClause})
        AND EXISTS (
            SELECT 1
            FROM TBL_MEDIDAS M1
            WHERE M1.NUM_NOTA = M.NUM_NOTA
              AND M1.COD_MEDIDA IN (${grupo1InClause})
              AND M1.COD_STAT_USU IN (${statusInClause})
        )
        ${extraWhere}
    GROUP BY
        M.COD_MEDIDA, M.DES_SITUACAO
    ORDER BY
        M.COD_MEDIDA, M.DES_SITUACAO;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarResumoGrupo2 };
