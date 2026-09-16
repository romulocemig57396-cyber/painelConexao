const { sql } = require('../db');
const config = require('../config');
const { inClauseParams, campoIgual } = require('./sqlHelpers');
const { MAPEAMENTO_MEDIDA_POR_SERVICO, substituirMedidasPorServico } = require('./mapeamentoMedidaServico');

/**
 * Histórico mensal de produtividade por matrícula (COD_RESP_CONC): conta
 * medidas "concluídas" (DAT_TREAL preenchida, independente do status atual)
 * dentre as configuradas em regrasHistorico.produtividade.medidas (ou o
 * subconjunto passado em filtros.medidas, quando o usuário filtra por
 * medida no gráfico). O ranking top N por mês e o agrupamento do restante em
 * 'OUTROS' são recalculados no banco sobre esse mesmo subconjunto filtrado
 * (ROW_NUMBER particionado por mês), não no frontend.
 *
 * `medidas` é sempre uma lista de códigos canônicos (0019/0080/...), do jeito
 * que a UI expõe o filtro. PSAA e PSAI usam códigos próprios pros conceitos
 * de aprovação (0030/0031) e da medida 0080 (0081) — ver
 * mapeamentoMedidaServico.js — então a lista é resolvida por serviço
 * (substituirMedidasPorServico) e o WHERE vira um OR de 3 ramos (padrão /
 * PSAA / PSAI), cada um só válido pro COD_SERVICO correspondente da linha,
 * já que o filtro de serviço pode combinar vários serviços de uma vez.
 *
 * filtros.servico/filtros.mercado: ver comentário em historicoAprovacao.js.
 */
async function buscarHistoricoProdutividade(pool, filtros = {}) {
  const { codServicoFiltro, dataMinima, produtividade } = config.regrasHistorico;
  const { medidas: medidasPadrao, topN } = produtividade;
  const medidas = filtros.medidas && filtros.medidas.length ? filtros.medidas : medidasPadrao;
  const servicos = filtros.servico?.length ? filtros.servico : codServicoFiltro;
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  request.input('topN', sql.Int, topN);
  const medidasPadraoInClause = inClauseParams(request, 'pmDef_', medidas);
  const medidasPsaaInClause = inClauseParams(
    request, 'pmPsaa_', substituirMedidasPorServico(medidas, 'PSAA', MAPEAMENTO_MEDIDA_POR_SERVICO),
  );
  const medidasPsaiInClause = inClauseParams(
    request, 'pmPsai_', substituirMedidasPorServico(medidas, 'PSAI', MAPEAMENTO_MEDIDA_POR_SERVICO),
  );
  const condMedidaPorServico = `(
        (N.COD_SERVICO NOT IN ('PSAA', 'PSAI') AND M.COD_MEDIDA IN (${medidasPadraoInClause}))
        OR (N.COD_SERVICO = 'PSAA' AND M.COD_MEDIDA IN (${medidasPsaaInClause}))
        OR (N.COD_SERVICO = 'PSAI' AND M.COD_MEDIDA IN (${medidasPsaiInClause}))
    )`;
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;
  const condMercado = filtros.mercado
    ? campoIgual('N.DES_MERCADO', request, 'mercado', filtros.mercado)
    : '1=1';
  const condRegional = regionalInClause ? `AND L.COD_SP IN (${regionalInClause})` : '';

  const query = `
    WITH Contagem AS (
        SELECT
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            M.COD_RESP_CONC,
            COUNT(*) AS QTD_CONCLUIDAS
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE ${condMedidaPorServico}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condMercado}
          ${condRegional}
        GROUP BY FORMAT(M.DAT_TREAL, 'yyyy-MM'), M.COD_RESP_CONC
    ),
    Ranking AS (
        SELECT
            MES,
            COD_RESP_CONC,
            QTD_CONCLUIDAS,
            ROW_NUMBER() OVER (PARTITION BY MES ORDER BY QTD_CONCLUIDAS DESC, COD_RESP_CONC ASC) AS RN
        FROM Contagem
    )
    SELECT MES, COD_RESP_CONC, QTD_CONCLUIDAS, RN
    FROM Ranking
    WHERE RN <= @topN

    UNION ALL

    SELECT MES, 'OUTROS' AS COD_RESP_CONC, SUM(QTD_CONCLUIDAS) AS QTD_CONCLUIDAS, @topN + 1 AS RN
    FROM Ranking
    WHERE RN > @topN
    GROUP BY MES
    HAVING SUM(QTD_CONCLUIDAS) > 0

    ORDER BY MES, RN;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarHistoricoProdutividade };
