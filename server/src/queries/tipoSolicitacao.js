const { inClauseParams } = require('./sqlHelpers');

// Atributos da solicitação usados como filtro nos painéis, todos vindos de
// TBL_DADOS_SOLIC (uma linha por nota — conferido com COUNT vs COUNT DISTINCT
// NUM_NOTA). Sempre usar JOIN_TIPO_SOLICITACAO depois do join de TBL_NOTAS (alias N).
//
// - Tipo de solicitação (LN, AC, ML, NT, ...): COD_FIN_ANALISE; vazio = 'SEM TIPO'.
// - Classe: RESIDENCIAL / COMERCIAL / INDUSTRIAL a partir de DES_CLASSE
//   (qualquer outra classe, ou vazio, cai em 'OUTRAS').
// - Faixa de caixas: NUM_CAIXAS em 1, 2, 3 e '4 OU MAIS'; nulo ou 0 = 'SEM INFORMAÇÃO'.
const SEM_TIPO = 'SEM TIPO';

const JOIN_TIPO_SOLICITACAO = 'LEFT JOIN TBL_DADOS_SOLIC DS ON DS.NUM_NOTA = N.NUM_NOTA';

const TIPO_SOLICITACAO = `COALESCE(NULLIF(LTRIM(RTRIM(DS.COD_FIN_ANALISE)), ''), '${SEM_TIPO}')`;

const CLASSE = `CASE
            WHEN DS.DES_CLASSE LIKE 'RESID%' THEN 'RESIDENCIAL'
            WHEN DS.DES_CLASSE LIKE 'COMERC%' THEN 'COMERCIAL'
            WHEN DS.DES_CLASSE LIKE 'INDUSTR%' THEN 'INDUSTRIAL'
            ELSE 'OUTRAS'
        END`;

const FAIXA_CAIXAS = `CASE
            WHEN DS.NUM_CAIXAS IS NULL OR DS.NUM_CAIXAS <= 0 THEN 'SEM INFORMAÇÃO'
            WHEN DS.NUM_CAIXAS = 1 THEN '1'
            WHEN DS.NUM_CAIXAS = 2 THEN '2'
            WHEN DS.NUM_CAIXAS = 3 THEN '3'
            ELSE '4 OU MAIS'
        END`;

/**
 * Condições `AND <expr> IN (...)` pros filtros de tipo de solicitação, classe e
 * faixa de caixas — string vazia pra cada filtro não informado (lista
 * ausente/vazia = sem filtro). `filtros` = { tipoSolicitacao, classe, faixaCaixas }.
 */
function condFiltrosSolicitacao(request, filtros = {}) {
  const partes = [];
  if (filtros.tipoSolicitacao?.length) {
    partes.push(`AND ${TIPO_SOLICITACAO} IN (${inClauseParams(request, 'ts_', filtros.tipoSolicitacao)})`);
  }
  if (filtros.classe?.length) {
    partes.push(`AND ${CLASSE} IN (${inClauseParams(request, 'cl_', filtros.classe)})`);
  }
  if (filtros.faixaCaixas?.length) {
    partes.push(`AND ${FAIXA_CAIXAS} IN (${inClauseParams(request, 'fx_', filtros.faixaCaixas)})`);
  }
  return partes.join('\n          ');
}

module.exports = {
  SEM_TIPO,
  JOIN_TIPO_SOLICITACAO,
  TIPO_SOLICITACAO,
  CLASSE,
  FAIXA_CAIXAS,
  condFiltrosSolicitacao,
};
