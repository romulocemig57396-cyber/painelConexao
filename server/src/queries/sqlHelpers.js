const { sql } = require('../db');

/**
 * Registra cada valor de `values` como parâmetro nomeado (@prefix0, @prefix1, ...)
 * na request e retorna a lista pronta pra um IN (...), evitando concatenação direta.
 */
function inClauseParams(request, prefix, values) {
  const names = values.map((value, index) => {
    const paramName = `${prefix}${index}`;
    request.input(paramName, sql.NVarChar, value);
    return `@${paramName}`;
  });
  return names.join(', ');
}

/**
 * Checagem de "palavra inteira" em campos compostos por múltiplos códigos
 * separados por espaço (ex: COD_STAT_USU = 'CANC PCOR RTEC') — nunca usar `=`
 * direto nesses campos, senão uma combinação com outros códigos nunca bate.
 * Padroniza espaço nas pontas do valor pra evitar bater como substring de
 * outra palavra (ex: 'CANC' dentro de 'DESCANCELAR').
 */
function campoContemPalavra(campoSql, request, paramName, palavra) {
  request.input(paramName, sql.NVarChar, `% ${palavra} %`);
  return `' ' + ${campoSql} + ' ' LIKE @${paramName}`;
}

function campoNaoContemPalavra(campoSql, request, paramName, palavra) {
  request.input(paramName, sql.NVarChar, `% ${palavra} %`);
  return `' ' + ${campoSql} + ' ' NOT LIKE @${paramName}`;
}

/**
 * Igualdade simples parametrizada (ex: N.DES_MERCADO = @mercado), pra campos
 * de valor único (não compostos por múltiplos códigos como COD_STAT_USU).
 */
function campoIgual(campoSql, request, paramName, valor) {
  request.input(paramName, sql.NVarChar, valor);
  return `${campoSql} = @${paramName}`;
}

/**
 * Versão "qualquer uma dessas palavras" de campoContemPalavra — equivalente a
 * `(campo LIKE '% A %' OR campo LIKE '% B %' OR ...)`, uma condição por
 * palavra, sempre por palavra inteira (nunca `IN`, que faria igualdade exata
 * num campo composto por vários códigos separados por espaço).
 */
function campoContemAlgumaPalavra(campoSql, request, prefix, palavras) {
  const condicoes = palavras.map((palavra, index) =>
    campoContemPalavra(campoSql, request, `${prefix}${index}`, palavra),
  );
  return `(${condicoes.join(' OR ')})`;
}

/**
 * Resolve o código de medida certo por LINHA, conforme o campo de serviço
 * (ex: N.COD_SERVICO) — PSAA e PSAI têm código próprio pro conceito
 * (`mapeamento.PSAA[conceito]`/`mapeamento.PSAI[conceito]`), os demais caem
 * no ELSE (`mapeamento.default[conceito]`). Necessário porque o filtro de
 * serviço pode combinar múltiplos serviços na mesma consulta (ex: COMT +
 * PSAA juntos) — uma lista estática de códigos não daria conta disso.
 * Usar sempre como `campo = ${medidaCasePorServico(...)}`, nunca dentro de IN.
 */
function medidaCasePorServico(campoServicoSql, request, prefix, conceito, mapeamento) {
  request.input(`${prefix}Psaa`, sql.NVarChar, mapeamento.PSAA[conceito]);
  request.input(`${prefix}Psai`, sql.NVarChar, mapeamento.PSAI[conceito]);
  request.input(`${prefix}Padrao`, sql.NVarChar, mapeamento.default[conceito]);
  return `CASE ${campoServicoSql} WHEN 'PSAA' THEN @${prefix}Psaa WHEN 'PSAI' THEN @${prefix}Psai ELSE @${prefix}Padrao END`;
}

module.exports = {
  inClauseParams,
  campoContemPalavra,
  campoNaoContemPalavra,
  campoContemAlgumaPalavra,
  campoIgual,
  medidaCasePorServico,
};
