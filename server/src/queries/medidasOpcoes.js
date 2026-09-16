async function buscarOpcoesMedidas(pool) {
  const result = await pool.request().query(`
    SELECT DISTINCT L.COD_SP AS REGIONAL
    FROM TBL_LOCAIS L
    WHERE L.COD_SP IS NOT NULL
      AND LTRIM(RTRIM(L.COD_SP)) <> ''
      AND L.COD_SP NOT IN ('PE', 'XX')
    ORDER BY L.COD_SP;
  `);

  return {
    regionais: result.recordset.map((row) => row.REGIONAL),
  };
}

module.exports = { buscarOpcoesMedidas };
