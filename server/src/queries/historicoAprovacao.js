const { sql } = require('../db');
const config = require('../config');
const { inClauseParams, campoContemPalavra, campoIgual, medidaCasePorServico } = require('./sqlHelpers');
const { MAPEAMENTO_MEDIDA_POR_SERVICO } = require('./mapeamentoMedidaServico');

/**
 * Histórico mensal de aprovação, 3 categorias mutuamente exclusivas por
 * prioridade: CANC > CTEC > RTEC. Registros que não batem com nenhuma das 3
 * (status intermediário, ex: ABER) são descartados — mesmo comportamento da
 * query validada com o usuário.
 *
 * A medida de aprovação varia por serviço (0019 pra a maioria, 0030 pra
 * PSAA, 0031 pra PSAI — ver mapeamentoMedidaServico.js), resolvida por LINHA
 * via medidaCasePorServico, já que o filtro de serviço pode combinar vários
 * serviços na mesma consulta (ex: COMT + PSAA juntos).
 *
 * filtros.servico (array de códigos, ex: ['COMT','COBT'] — ver
 * config.regrasHistorico.servicosDisponiveis pra whitelist completa)
 * substitui o codServicoFiltro padrão quando informado (IN, soma os
 * códigos); filtros.mercado (URBANO/RURAL, valor único) filtra por
 * N.DES_MERCADO — nenhum dos dois participa do agrupamento, só do WHERE
 * (mesma agregação por MES de antes quando ausentes, preservando o
 * comportamento atual).
 */
async function buscarHistoricoAprovacao(pool, filtros = {}) {
  const { statusCancelado, statusAprovado, statusReprovado, codServicoFiltro, dataMinima } = config.regrasHistorico;

  const servicos = filtros.servico?.length ? filtros.servico : codServicoFiltro;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const medidaAprovacaoCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'aprov', 'aprovacao', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );

  const condCancelado = campoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);
  const condAprovado = campoContemPalavra('M.COD_STAT_USU', request, 'stApr', statusAprovado);
  const condReprovado = campoContemPalavra('M.COD_STAT_USU', request, 'stRep', statusReprovado);
  const condMercado = filtros.mercado
    ? campoIgual('N.DES_MERCADO', request, 'mercado', filtros.mercado)
    : '1=1';

  const query = `
    SELECT MES, CATEGORIA, COUNT(*) AS QTD
    FROM (
        SELECT
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            CASE
                WHEN ${condCancelado} THEN 'CANCELADO'
                WHEN ${condAprovado} THEN 'APROVADO'
                WHEN ${condReprovado} THEN 'REPROVADO'
            END AS CATEGORIA
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        WHERE M.COD_MEDIDA = ${medidaAprovacaoCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condMercado}
    ) X
    WHERE CATEGORIA IS NOT NULL
    GROUP BY MES, CATEGORIA
    ORDER BY MES, CATEGORIA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarHistoricoAprovacao };
