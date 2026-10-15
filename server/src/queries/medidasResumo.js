const { sql } = require('../db');
const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');
const { APPLY_REGULATORIO, SITUACAO_REGULATORIA } = require('./regulatorio');
const { JOIN_TIPO_SOLICITACAO, condFiltrosSolicitacao } = require('./tipoSolicitacao');

/**
 * Mesma regra de negócio de buscarMedidasPendentes (grupo1/status/COD_SERVICO,
 * com os mesmos filtros opcionais de area/status/medidas/situacao/grupo2), mas
 * agregada por COD_MEDIDA + DES_SITUACAO — usada pelo gráfico de barras da aba
 * "Gráficos". O LEFT JOIN do grupo 2 só existe pra suportar o filtro "grupo2"
 * (atalho do card "Com pendência grupo 2"); a contagem em si não sinaliza grupo 2.
 */
function prepararBaseResumo(pool, filtros) {
  const {
    grupo1Medidas: grupo1Padrao,
    grupo2Medidas,
    statusPendente,
    codServicoFiltro: servicosPadrao,
  } = config.regrasNegocio;
  const grupo1Medidas = filtros.medidas && filtros.medidas.length ? filtros.medidas : grupo1Padrao;
  const codServicoFiltro = filtros.servico?.length ? filtros.servico : servicosPadrao;
  const regionais = filtros.regional?.length ? filtros.regional : null;

  const request = pool.request();

  const grupo1InClause = inClauseParams(request, 'g1_', grupo1Medidas);
  const grupo2InClause = inClauseParams(request, 'g2_', grupo2Medidas);
  const statusInClause = inClauseParams(request, 'st_', statusPendente);
  const servicoInClause = inClauseParams(request, 'sv_', codServicoFiltro);
  const regionalInClause = regionais ? inClauseParams(request, 'rg_', regionais) : null;
  const situacoes = filtros.situacao?.length ? filtros.situacao : null;
  const situacaoInClause = situacoes ? inClauseParams(request, 'sit_', situacoes) : null;

  let extraWhere = '';
  if (filtros.area) {
    request.input('filtroArea', sql.NVarChar, filtros.area);
    extraWhere += ' AND M.COD_AREA_RESP = @filtroArea';
  }
  if (filtros.status) {
    request.input('filtroStatus', sql.NVarChar, filtros.status);
    extraWhere += ' AND M.COD_STAT_USU = @filtroStatus';
  }
  if (situacaoInClause) {
    extraWhere += ` AND ${SITUACAO_REGULATORIA} IN (${situacaoInClause})`;
  }
  if (filtros.grupo2) {
    extraWhere += ' AND P.MEDIDAS_PENDENTES IS NOT NULL';
  }
  extraWhere += ` ${condFiltrosSolicitacao(request, filtros)}`;
  if (regionalInClause) {
    extraWhere += ` AND COALESCE(R.REGIONAL_REGULATORIA, L.COD_SP) IN (${regionalInClause})`;
  }

  // FROM/WHERE compartilhado pelo resumo por medida/situação e pelo total do
  // valor da obra — os dois sempre enxergam exatamente as mesmas medidas.
  const base = `
      FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N
        ON M.NUM_NOTA = N.NUM_NOTA
    ${JOIN_TIPO_SOLICITACAO}
    LEFT JOIN TBL_LOCAIS L
        ON L.COD_LOCAL_ANTIGO = CONCAT('8', REPLACE(N.COD_LOCAL, 'EX-', ''))
    ${APPLY_REGULATORIO}
    LEFT JOIN (
        SELECT
            M2.NUM_NOTA,
            STRING_AGG(M2.COD_MEDIDA, ', ') AS MEDIDAS_PENDENTES
        FROM TBL_MEDIDAS M2
        WHERE M2.COD_MEDIDA IN (${grupo2InClause})
          AND M2.COD_STAT_USU IN (${statusInClause})
        GROUP BY M2.NUM_NOTA
    ) P ON P.NUM_NOTA = M.NUM_NOTA
    WHERE
        M.COD_MEDIDA IN (${grupo1InClause})
        AND M.COD_STAT_USU IN (${statusInClause})
        AND N.COD_SERVICO IN (${servicoInClause})
        ${extraWhere}`;

  return { request, base };
}

async function buscarResumoMedidas(pool, filtros = {}) {
  const { request, base } = prepararBaseResumo(pool, filtros);

  const query = `
    SELECT COD_MEDIDA, DES_SITUACAO, COUNT(*) AS QUANTIDADE
    FROM (
      SELECT
        M.COD_MEDIDA,
        ${SITUACAO_REGULATORIA} AS DES_SITUACAO
      ${base}
    ) X
    GROUP BY COD_MEDIDA, DES_SITUACAO
    ORDER BY
        COD_MEDIDA, DES_SITUACAO;
  `;

  const result = await request.query(query);
  return result.recordset;
}

/**
 * Valor total da obra (TBL_OBRA_CUSTOS.VAL_TOTAL_OBRA) das notas que aparecem no
 * gráfico de medidas pendentes com os mesmos filtros. Cada nota conta uma vez
 * só (DISTINCT), mesmo com várias medidas pendentes; valor nulo ou não positivo
 * não entra na soma. TBL_OBRA_CUSTOS liga pela COD_NOTA (uma linha por nota).
 */
async function buscarValorObraMedidas(pool, filtros = {}) {
  const { request, base } = prepararBaseResumo(pool, filtros);

  const query = `
    SELECT
      COUNT(*) AS NOTAS,
      SUM(CASE WHEN C.VAL_TOTAL_OBRA > 0 THEN C.VAL_TOTAL_OBRA END) AS VALOR_OBRA
    FROM (
      SELECT DISTINCT N.NUM_NOTA
      ${base}
    ) X
    LEFT JOIN TBL_OBRA_CUSTOS C ON C.COD_NOTA = X.NUM_NOTA;
  `;

  const result = await request.query(query);
  const linha = result.recordset[0] || {};
  return { notas: linha.NOTAS ?? 0, valorObra: linha.VALOR_OBRA ?? 0 };
}

module.exports = { buscarResumoMedidas, buscarValorObraMedidas };
