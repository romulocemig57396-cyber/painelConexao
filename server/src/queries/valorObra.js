// Valor total da obra por nota: TBL_OBRA_CUSTOS.VAL_TOTAL_OBRA, ligado pela
// COD_NOTA (uma linha por nota, conferido). Cada nota conta uma vez só por
// gráfico (DISTINCT) e valor nulo ou não positivo não entra na soma.
const SOMA_VALOR_OBRA = 'SUM(CASE WHEN C.VAL_TOTAL_OBRA > 0 THEN C.VAL_TOTAL_OBRA END)';

// Dimensões dos filtros do painel externo, nas consultas granulares da exportação.
const DIMENSOES_FILTROS = ['SERVICO', 'MERCADO', 'REGIONAL', 'TIPO_SOLICITACAO', 'CLASSE', 'FAIXA_CAIXAS'];

/**
 * Transforma a consulta interna de um gráfico do histórico (que expõe NUM_NOTA e
 * a coluna de categoria — linhas com categoria nula não entram no gráfico) na
 * consulta do valor da obra das notas desse mesmo gráfico.
 * - sem `dimensoes`: um total só ({ NOTAS, VALOR_OBRA });
 * - com `dimensoes`: um total por combinação delas (exportação pro painel externo).
 */
function consultaValorObra(interna, colunaCategoria, dimensoes = []) {
  const selecionaDims = dimensoes.map((d) => `D.${d}`).join(', ');
  const distinctDims = dimensoes.length ? `, ${dimensoes.join(', ')}` : '';
  return `
    SELECT ${selecionaDims ? `${selecionaDims},` : ''}
      COUNT(*) AS NOTAS,
      ${SOMA_VALOR_OBRA} AS VALOR_OBRA
    FROM (
      SELECT DISTINCT NUM_NOTA${distinctDims}
      FROM (${interna}
      ) X
      WHERE ${colunaCategoria} IS NOT NULL
    ) D
    LEFT JOIN TBL_OBRA_CUSTOS C ON C.COD_NOTA = D.NUM_NOTA
    ${selecionaDims ? `GROUP BY ${selecionaDims}` : ''};
  `;
}

// Linha única do total (sem dimensões) -> { notas, valorObra }.
function totalValorObra(recordset) {
  const linha = recordset[0] || {};
  return { notas: linha.NOTAS ?? 0, valorObra: linha.VALOR_OBRA ?? 0 };
}

module.exports = { DIMENSOES_FILTROS, consultaValorObra, totalValorObra };
