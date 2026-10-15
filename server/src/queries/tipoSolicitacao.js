const { inClauseParams } = require('./sqlHelpers');

// Tipo de solicitação (LN, AC, ML, NT, ...) vem de TBL_DADOS_SOLIC.COD_FIN_ANALISE
// (uma linha por nota — conferido com COUNT vs COUNT DISTINCT NUM_NOTA). Valor
// nulo/vazio aparece como 'SEM TIPO' pra poder ser filtrado como qualquer outro.
// Sempre usar JOIN_TIPO_SOLICITACAO depois do join de TBL_NOTAS (alias N).
const SEM_TIPO = 'SEM TIPO';

const JOIN_TIPO_SOLICITACAO = 'LEFT JOIN TBL_DADOS_SOLIC DS ON DS.NUM_NOTA = N.NUM_NOTA';

const TIPO_SOLICITACAO = `COALESCE(NULLIF(LTRIM(RTRIM(DS.COD_FIN_ANALISE)), ''), '${SEM_TIPO}')`;

/**
 * Condição `AND <tipo> IN (...)` pro filtro de tipo de solicitação — string
 * vazia quando o filtro não foi informado (lista ausente/vazia = sem filtro).
 */
function condTipoSolicitacao(request, tipos) {
  if (!tipos?.length) return '';
  return `AND ${TIPO_SOLICITACAO} IN (${inClauseParams(request, 'ts_', tipos)})`;
}

module.exports = { SEM_TIPO, JOIN_TIPO_SOLICITACAO, TIPO_SOLICITACAO, condTipoSolicitacao };
