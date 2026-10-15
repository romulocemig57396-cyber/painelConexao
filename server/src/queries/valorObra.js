// Valor total da obra por nota: TBL_OBRA_CUSTOS.VAL_TOTAL_OBRA, ligado pela
// COD_NOTA (uma linha por nota, conferido). Cada nota conta uma vez só por
// gráfico (DISTINCT) e valor nulo ou não positivo não entra na soma.
const SOMA_VALOR_OBRA = 'SUM(CASE WHEN C.VAL_TOTAL_OBRA > 0 THEN C.VAL_TOTAL_OBRA END)';

/**
 * Transforma a consulta interna de um gráfico do histórico (que expõe NUM_NOTA e
 * a coluna de categoria — linhas com categoria nula não entram no gráfico) na
 * consulta do valor da obra das notas desse mesmo gráfico ({ NOTAS, VALOR_OBRA }).
 */
function consultaValorObra(interna, colunaCategoria) {
  return `
    SELECT
      COUNT(*) AS NOTAS,
      ${SOMA_VALOR_OBRA} AS VALOR_OBRA
    FROM (
      SELECT DISTINCT NUM_NOTA
      FROM (${interna}
      ) X
      WHERE ${colunaCategoria} IS NOT NULL
    ) D
    LEFT JOIN TBL_OBRA_CUSTOS C ON C.COD_NOTA = D.NUM_NOTA;
  `;
}

// Linha única do total -> { notas, valorObra }.
function totalValorObra(recordset) {
  const linha = recordset[0] || {};
  return { notas: linha.NOTAS ?? 0, valorObra: linha.VALOR_OBRA ?? 0 };
}

module.exports = { consultaValorObra, totalValorObra };
