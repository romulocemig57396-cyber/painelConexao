const { sql } = require('../db');
const config = require('../config');
const { inClauseParams, campoNaoContemPalavra, campoIgual, medidaCasePorServico } = require('./sqlHelpers');
const { MAPEAMENTO_MEDIDA_POR_SERVICO, todosCodigosMedida } = require('./mapeamentoMedidaServico');

/**
 * Histórico mensal de tipo de liberação: uma categoria por medida
 * (comObras/semObras/servicosRede), excluindo qualquer registro cujo
 * COD_STAT_USU contenha CANC (palavra inteira).
 *
 * comObras/semObras variam por serviço (0590/0550 pra maioria, 0591/0551 pra
 * PSAA/PSAI — ver mapeamentoMedidaServico.js), resolvidos por LINHA via
 * medidaCasePorServico; servicosRede (0501) não varia. O prefiltro
 * M.COD_MEDIDA IN (...) usa todos os códigos possíveis das 3 categorias (union,
 * via todosCodigosMedida) pra não descartar nenhuma variação antes da
 * classificação — por isso o filtro extra de TIPO IS NOT NULL no final, pra
 * descartar combinações código/serviço que não fazem sentido (ex: código
 * 0591 numa nota COMT, que não é nem comObras nem semObras pra esse serviço).
 *
 * filtros.servico/filtros.mercado: ver comentário em historicoAprovacao.js.
 */
async function buscarHistoricoLiberacao(pool, filtros = {}) {
  const { liberacaoMedidas, statusCancelado, codServicoFiltro, dataMinima } = config.regrasHistorico;
  const { servicosRede } = liberacaoMedidas;
  const servicos = filtros.servico?.length ? filtros.servico : codServicoFiltro;

  const request = pool.request();
  request.input('medServicosRede', sql.NVarChar, servicosRede);
  request.input('dataMinima', sql.Date, new Date(dataMinima));
  const medComObrasCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'comObras', 'comObras', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );
  const medSemObrasCase = medidaCasePorServico(
    'N.COD_SERVICO', request, 'semObras', 'semObras', MAPEAMENTO_MEDIDA_POR_SERVICO,
  );
  const medidasInClause = inClauseParams(request, 'lm_', [
    ...todosCodigosMedida('comObras'),
    ...todosCodigosMedida('semObras'),
    servicosRede,
  ]);
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const condNaoCancelado = campoNaoContemPalavra('M.COD_STAT_USU', request, 'stCanc', statusCancelado);
  const condMercado = filtros.mercado
    ? campoIgual('N.DES_MERCADO', request, 'mercado', filtros.mercado)
    : '1=1';

  const query = `
    SELECT MES, TIPO, COUNT(*) AS QTD
    FROM (
        SELECT
            FORMAT(M.DAT_TREAL, 'yyyy-MM') AS MES,
            CASE
                WHEN M.COD_MEDIDA = ${medComObrasCase} THEN 'COM_OBRAS'
                WHEN M.COD_MEDIDA = ${medSemObrasCase} THEN 'SEM_OBRAS'
                WHEN M.COD_MEDIDA = @medServicosRede THEN 'SERVICOS_REDE'
            END AS TIPO
        FROM TBL_MEDIDAS M
        INNER JOIN TBL_NOTAS N ON N.NUM_NOTA = M.NUM_NOTA
        WHERE M.COD_MEDIDA IN (${medidasInClause})
          AND N.COD_SERVICO IN (${servicoInClause})
          AND M.DAT_TREAL >= @dataMinima
          AND ${condNaoCancelado}
          AND ${condMercado}
    ) X
    WHERE TIPO IS NOT NULL
    GROUP BY MES, TIPO
    ORDER BY MES, TIPO;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarHistoricoLiberacao };
