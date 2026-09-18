const { inClauseParams } = require('./sqlHelpers');
const config = require('../config');
const { APPLY_REGULATORIO, SITUACAO_REGULATORIA } = require('./regulatorio');

/**
 * Notas com medida 0080 pendente (status configurável em statusPendente,
 * por padrão ABER/ANDM) que já têm uma medida 0070 concluída
 * (COD_STAT_USU = 'CONC') — ou seja, o orçamento já pode ser emitido porque
 * a conexão foi concluída. Vencimento/situação usam a mesma fonte
 * regulatória (TBL_ANEEL_INDGER_V20_DIARIO) já usada pra medida 0080 em
 * /api/medidas (grupo 1) — ver server/src/queries/medidasPendentes.js.
 */
async function buscarOrcamentosEmitiveis(pool, filtros = {}) {
  const { statusPendente, codServicoFiltro: servicosPadrao } = config.regrasNegocio;
  const codServicoFiltro = filtros.servico?.length ? filtros.servico : servicosPadrao;
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();

  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const servicoInClause = inClauseParams(request, 'sv_', codServicoFiltro);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;

  const extraWhere = regionalInClause
    ? ` AND COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP) IN (${regionalInClause})`
    : '';

  const query = `
    SELECT
        N.NUM_NOTA,
        N.COD_SERVICO,
        N.DES_SERVICO,
        N.DES_OBRA,
        N.DES_ENDERECO_OBRA,
        COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP) AS REGIONAL,
        L.DES_LOCAL      AS LOCALIDADE,
        N.DAT_CRIACAO    AS DATA_CRIACAO_NOTA,
        M.COD_MEDIDA,
        M.COD_STAT_USU,
        M.DAT_SOLIC      AS DATA_CRIACAO_MEDIDA,
        R.DAT_VENCIMENTO AS DATA_VENCIMENTO,
        R.ITEM_ANEXO,
        R.PRAZO_PADRAO,
        R.PRAZO_REAL,
        R.GER_EXP_RESP,
        R.TIPO_PRAZO,
        M.DAT_TREAL      AS DATA_CONCLUSAO_REAL,
        M.COD_AREA_RESP,
        ${SITUACAO_REGULATORIA} AS DES_SITUACAO
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N
        ON M.NUM_NOTA = N.NUM_NOTA
    LEFT JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
    ${APPLY_REGULATORIO}
    WHERE
        M.COD_MEDIDA = '0080'
        AND M.COD_STAT_USU IN (${statusInClause})
        AND N.COD_SERVICO IN (${servicoInClause})
        AND EXISTS (
            SELECT 1 FROM TBL_MEDIDAS M2
            WHERE M2.NUM_NOTA = M.NUM_NOTA
              AND M2.COD_MEDIDA = '0070'
              AND M2.COD_STAT_USU = 'CONC'
        )
        ${extraWhere}
    ORDER BY
        N.NUM_NOTA, R.DAT_VENCIMENTO ASC;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarOrcamentosEmitiveis };
