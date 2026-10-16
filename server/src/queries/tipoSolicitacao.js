const config = require('../config');
const { inClauseParams } = require('./sqlHelpers');

// Atributos da solicitação usados como filtro nos painéis, todos vindos de
// TBL_DADOS_SOLIC (uma linha por nota — conferido com COUNT vs COUNT DISTINCT
// NUM_NOTA). Sempre usar JOIN_TIPO_SOLICITACAO depois do join de TBL_NOTAS (alias N).
//
// - Tipo de solicitação (LN, AC, ML, NT, ...): COD_FIN_ANALISE; vazio = 'SEM TIPO'.
// - Classe: RESIDENCIAL / COMERCIAL / INDUSTRIAL a partir de DES_CLASSE
//   (qualquer outra classe, ou vazio, cai em 'OUTRAS').
// - Faixa de caixas: NUM_CAIXAS em 1, 2, 3 e '4 OU MAIS'; nulo ou 0 = 'SEM INFORMAÇÃO'.
// - Universalização: N.COD_UNIVERSALIZACAO (TBL_NOTAS) nas 5 categorias do gráfico
//   "Universalização de obras" — universalizacaoCase() é a única definição, usada
//   pelo gráfico e pelo filtro.
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

// CASE da categoria de universalização. Precisa do `request` porque os códigos de
// cada categoria (config.regrasHistorico.universalizacao) viajam como parâmetros;
// o resultado fica guardado por request, então o mesmo CASE pode aparecer no
// SELECT e no WHERE da mesma consulta sem registrar os parâmetros duas vezes.
const casePorRequest = new WeakMap();

function universalizacaoCase(request) {
  if (!casePorRequest.has(request)) {
    const { universalizadaCodigos, naoUniversalizadaCodigos, foraUniversalizacaoCodigos, segurancaCodigos } =
      config.regrasHistorico.universalizacao;
    const universalizadaInClause = inClauseParams(request, 'univ_', universalizadaCodigos);
    const naoUniversalizadaInClause = inClauseParams(request, 'naoUniv_', naoUniversalizadaCodigos);
    const foraUniversalizacaoInClause = inClauseParams(request, 'foraUniv_', foraUniversalizacaoCodigos);
    const segurancaInClause = inClauseParams(request, 'seg_', segurancaCodigos);
    casePorRequest.set(request, `CASE
                WHEN N.COD_UNIVERSALIZACAO IN (${universalizadaInClause}) THEN 'UNIVERSALIZADA'
                WHEN N.COD_UNIVERSALIZACAO IN (${naoUniversalizadaInClause}) THEN 'NAO_UNIVERSALIZADA'
                WHEN N.COD_UNIVERSALIZACAO IN (${foraUniversalizacaoInClause}) THEN 'FORA_UNIVERSALIZACAO'
                WHEN N.COD_UNIVERSALIZACAO IN (${segurancaInClause}) THEN 'SEGURANCA'
                ELSE 'OUTROS'
            END`);
  }
  return casePorRequest.get(request);
}

// Colunas prontas pros SELECTs granulares da exportação (painel externo).
const COLUNAS_SOLICITACAO = `${TIPO_SOLICITACAO} AS TIPO_SOLICITACAO,
            ${CLASSE} AS CLASSE,
            ${FAIXA_CAIXAS} AS FAIXA_CAIXAS`;

// COLUNAS_SOLICITACAO + a categoria de universalização (que precisa do request pros
// parâmetros do CASE) — dimensões dos filtros do painel externo.
function colunasSolicitacao(request) {
  return `${COLUNAS_SOLICITACAO},
            ${universalizacaoCase(request)} AS UNIVERSALIZACAO`;
}

/**
 * Condições `AND <expr> IN (...)` pros filtros de tipo de solicitação, classe,
 * faixa de caixas e universalização — string vazia pra cada filtro não informado
 * (lista ausente/vazia = sem filtro).
 * `filtros` = { tipoSolicitacao, classe, faixaCaixas, universalizacao }.
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
  if (filtros.universalizacao?.length) {
    partes.push(`AND ${universalizacaoCase(request)} IN (${inClauseParams(request, 'un_', filtros.universalizacao)})`);
  }
  return partes.join('\n          ');
}

module.exports = {
  SEM_TIPO,
  JOIN_TIPO_SOLICITACAO,
  TIPO_SOLICITACAO,
  CLASSE,
  FAIXA_CAIXAS,
  COLUNAS_SOLICITACAO,
  universalizacaoCase,
  colunasSolicitacao,
  condFiltrosSolicitacao,
};
