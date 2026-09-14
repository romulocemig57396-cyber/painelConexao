// Parser comum pros filtros de lista (?medidas=0019,0032) usados em várias
// rotas. Ausente => undefined (usa o padrão configurado). Presente (mesmo
// vazio, ex: usuário desmarcou todas as opções) => array, possivelmente
// vazio — nesse caso o chamador deve responder sem consultar o banco
// (COD_MEDIDA IN () é inválido em T-SQL).
function parseListaFiltro(valor) {
  if (typeof valor !== 'string') return undefined;
  return valor.split(',').map((v) => v.trim()).filter(Boolean);
}

// Valida um valor de query string contra uma lista fixa de opções (ex:
// servico=COMT|COBT, mercado=URBANO|RURAL). Ausente/vazio => undefined (usa
// o padrão do chamador). Presente mas fora da lista => lança erro 400 —
// nunca cai silenciosamente pro padrão, senão um valor digitado errado pelo
// usuário passaria despercebido como "sem filtro".
function validarEnum(valor, permitidos, nomeCampo) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const normalizado = String(valor).trim().toUpperCase();
  if (!permitidos.includes(normalizado)) {
    const erro = new Error(`Valor inválido para "${nomeCampo}": ${valor}. Use um de: ${permitidos.join(', ')}`);
    erro.status = 400;
    throw erro;
  }
  return normalizado;
}

// Como validarEnum, mas pra filtro de múltiplos valores (ex: servico=COMT,COBT,PSAA).
// Ausente/vazio => undefined (usa o padrão do chamador). Presente => array
// (possivelmente vazio, se o usuário desmarcou tudo — o chamador deve tratar
// isso sem consultar o banco, mesmo motivo do parseListaFiltro). Qualquer
// valor fora da lista permitida => erro 400, nunca ignorado silenciosamente.
function validarListaEnum(valor, permitidos, nomeCampo) {
  const lista = parseListaFiltro(valor);
  if (lista === undefined) return undefined;
  const normalizada = lista.map((v) => v.toUpperCase());
  const invalidos = normalizada.filter((v) => !permitidos.includes(v));
  if (invalidos.length) {
    const erro = new Error(
      `Valor inválido para "${nomeCampo}": ${invalidos.join(', ')}. Use um ou mais de: ${permitidos.join(', ')}`,
    );
    erro.status = 400;
    throw erro;
  }
  return normalizada;
}

module.exports = { parseListaFiltro, validarEnum, validarListaEnum };
