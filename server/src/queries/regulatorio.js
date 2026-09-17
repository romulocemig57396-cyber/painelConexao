const APPLY_REGULATORIO = `
    OUTER APPLY (
        SELECT TOP (1)
            A.ITEM_ANEXO,
            A.PRAZO_PADRAO,
            A.PRAZO_REAL,
            A.DAT_VENCIMENTO,
            A.REGIONAL AS REGIONAL_REGULATORIA,
            A.GER_EXP_RESP,
            A.TIPO_PRAZO,
            A.PRAZO_EXPURGO,
            A.PRAZO_EXPURGO_POS_VENC
        FROM TBL_ANEEL_INDGER_V20_DIARIO A
        WHERE A.NUM_NOTA = M.NUM_NOTA
        ORDER BY
            CASE WHEN A.DAT_VENCIMENTO IS NULL THEN 1 ELSE 0 END,
            A.DAT_VENCIMENTO DESC,
            A.PRAZO_REAL DESC,
            A.ITEM_ANEXO DESC
    ) R`;

const SITUACAO_REGULATORIA = `
    CASE
        WHEN M.COD_MEDIDA = '0019' THEN 'PENDENTES'
        WHEN R.DAT_VENCIMENTO IS NULL THEN 'SEM VENCIMENTO REGULATÓRIO'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS date), CAST(R.DAT_VENCIMENTO AS date)) < 0 THEN 'EM ATRASO'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS date), CAST(R.DAT_VENCIMENTO AS date)) = 0 THEN 'VENCE HOJE'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS date), CAST(R.DAT_VENCIMENTO AS date)) <= 7 THEN 'VENCE 7 DIAS'
        ELSE 'NO PRAZO'
    END`;

function logRegulatorio(rows, contexto) {
  if (process.env.REGULATORIO_DEBUG !== 'true') return;
  rows.slice(0, 20).forEach((row) => {
    console.info(`[regulatorio:${contexto}]`, {
      NUM_NOTA: row.NUM_NOTA,
      ITEM_ANEXO: row.ITEM_ANEXO,
      PRAZO_PADRAO: row.PRAZO_PADRAO,
      DAT_VENCIMENTO: row.DATA_VENCIMENTO,
      REGIONAL: row.REGIONAL_REGULATORIA,
    });
  });
}

module.exports = { APPLY_REGULATORIO, SITUACAO_REGULATORIA, logRegulatorio };
