/**
 * Busca a linha mais recente de TBL_DATA_ATUALIZA_BANCO. Retorna as duas colunas
 * de data (DB1/DB2) — temporário até confirmar qual delas é a fonte correta.
 */
async function buscarUltimaAtualizacao(pool) {
  const result = await pool.request().query(`
    SELECT TOP 1
        DAT_ATUALIZA_DB1,
        DAT_ATUALIZA_DB2
    FROM TBL_DATA_ATUALIZA_BANCO
    ORDER BY DAT_ATUALIZA_DB1 DESC;
  `);
  return result.recordset[0] || null;
}

module.exports = { buscarUltimaAtualizacao };
