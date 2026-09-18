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
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;
  const medidaAprovacaoCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'aprov', 'aprovacao', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );

  const condCancelado = campoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);
  const condAprovado = campoContemPalavra('M.COD_STAT_USU', request, 'stApr', statusAprovado);
  const condReprovado = campoContemPalavra('M.COD_STAT_USU', request, 'stRep', statusReprovado);
  const condMercado = filtros.mercado
    ? campoIgual('N.DES_MERCADO', request, 'mercado', filtros.mercado)
    : '1=1';
  const condRegional = regionalInClause ? `AND L.COD_SP IN (${regionalInClause})` : '';

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
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE M.COD_MEDIDA = ${medidaAprovacaoCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condMercado}
          ${condRegional}
    ) X
    WHERE CATEGORIA IS NOT NULL
    GROUP BY MES, CATEGORIA
    ORDER BY MES, CATEGORIA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

/**
 * Versão sem filtro da mesma regra, usada pela exportação pro painel externo
 * (server/scripts/exportarPainelExterno.js): em vez de somar por MES+CATEGORIA
 * só dentro do recorte de servico/mercado/regional pedido, agrupa também por
 * essas 3 dimensões — uma consulta só cobre todas as combinações, em vez do
 * laço combinatório que o script estático antigo fazia.
 */
async function buscarHistoricoAprovacaoGranular(pool) {
  const { statusCancelado, statusAprovado, statusReprovado, servicosDisponiveis, dataMinima } =
    config.regrasHistorico;

  const request = pool.request();
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const servicoInClause = inClauseParams(request, 'sv_', servicosDisponiveis);
  const medidaAprovacaoCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'aprov', 'aprovacao', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );

  const condCancelado = campoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);
  const condAprovado = campoContemPalavra('M.COD_STAT_USU', request, 'stApr', statusAprovado);
  const condReprovado = campoContemPalavra('M.COD_STAT_USU', request, 'stRep', statusReprovado);

  const query = `
    SELECT MES, SERVICO, MERCADO, REGIONAL, CATEGORIA, COUNT(*) AS QTD
    FROM (
        SELECT
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            N.COD_SERVICO AS SERVICO,
            N.DES_MERCADO AS MERCADO,
            L.COD_SP AS REGIONAL,
            CASE
                WHEN ${condCancelado} THEN 'CANCELADO'
                WHEN ${condAprovado} THEN 'APROVADO'
                WHEN ${condReprovado} THEN 'REPROVADO'
            END AS CATEGORIA
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        INNER JOIN TBL_LOCAIS L ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
        WHERE M.COD_MEDIDA = ${medidaAprovacaoCase}
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
    ) X
    WHERE CATEGORIA IS NOT NULL
    GROUP BY MES, SERVICO, MERCADO, REGIONAL, CATEGORIA
    ORDER BY MES, SERVICO, MERCADO, REGIONAL, CATEGORIA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarHistoricoAprovacao, buscarHistoricoAprovacaoGranular };
