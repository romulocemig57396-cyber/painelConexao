const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');
const { SITUACAO_PRAZO_0070 } = require('./regulatorio');
const { JOIN_TIPO_SOLICITACAO, colunasSolicitacao, condFiltrosSolicitacao } = require('./tipoSolicitacao');

async function buscarResumoMedida0070Regional(pool, filtros = {}) {
  const { grupo1Medidas, statusPendente, codServicoFiltro: servicosPadrao } = config.regrasNegocio;
  const servicos = filtros.servico?.length ? filtros.servico : servicosPadrao;
  const regionais = filtros.regional?.length ? filtros.regional : null;
  const request = pool.request();
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;

  const filtrosExtras = `${regionalInClause ? `AND L.COD_SP IN (${regionalInClause})` : ''}
      ${condFiltrosSolicitacao(request, filtros)}`;
  const query = `
    SELECT
        L.COD_SP AS REGIONAL,
        ${SITUACAO_PRAZO_0070} AS DES_SITUACAO,
        COUNT(*) AS QUANTIDADE
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    ${JOIN_TIPO_SOLICITACAO}
    INNER JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
    WHERE M.COD_MEDIDA = '0070'
      AND M.COD_STAT_USU IN (${statusInClause})
      AND N.COD_SERVICO IN (${servicoInClause})
      AND EXISTS (
        SELECT 1
        FROM TBL_MEDIDAS M1
        WHERE M1.NUM_NOTA = M.NUM_NOTA
          AND M1.COD_MEDIDA IN (${grupo1InClause})
          AND M1.COD_STAT_USU IN (${statusInClause})
      )
      ${filtrosExtras}
    GROUP BY L.COD_SP, ${SITUACAO_PRAZO_0070}
    ORDER BY REGIONAL, DES_SITUACAO;
  `;

  const result = await request.query(query);
  return result.recordset;
}

// Versão sem filtro de serviço/regional (usa o SERVICO na saída em vez de só
// no WHERE), pro painel externo — que filtra do lado do cliente, sem round-trip.
async function buscarResumoMedida0070RegionalGranular(pool) {
  const { grupo1Medidas, statusPendente, codServicoFiltro: servicos } = config.regrasNegocio;
  const request = pool.request();
  const servicoInClause = inClauseParams(request, 'sv_', servicos);
  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);

  // Agrupa pelos aliases de uma subconsulta (e não repetindo as expressões, que agora
  // levam parâmetros) — mesmo formato das consultas granulares do Histórico.
  const query = `
    SELECT SERVICO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, UNIVERSALIZACAO, DES_SITUACAO,
        COUNT(*) AS QUANTIDADE
    FROM (
    SELECT
        N.COD_SERVICO AS SERVICO,
        L.COD_SP AS REGIONAL,
        ${colunasSolicitacao(request)},
        ${SITUACAO_PRAZO_0070} AS DES_SITUACAO
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    ${JOIN_TIPO_SOLICITACAO}
    INNER JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
    WHERE M.COD_MEDIDA = '0070'
      AND M.COD_STAT_USU IN (${statusInClause})
      AND N.COD_SERVICO IN (${servicoInClause})
      AND EXISTS (
        SELECT 1
        FROM TBL_MEDIDAS M1
        WHERE M1.NUM_NOTA = M.NUM_NOTA
          AND M1.COD_MEDIDA IN (${grupo1InClause})
          AND M1.COD_STAT_USU IN (${statusInClause})
      )
    ) X
    GROUP BY SERVICO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, UNIVERSALIZACAO, DES_SITUACAO
    ORDER BY SERVICO, REGIONAL, TIPO_SOLICITACAO, CLASSE, FAIXA_CAIXAS, UNIVERSALIZACAO, DES_SITUACAO;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarResumoMedida0070Regional, buscarResumoMedida0070RegionalGranular };
