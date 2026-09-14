const config = require('../config');

// PSAA e PSAI usam códigos de medida diferentes dos outros 10 serviços pro
// mesmo conceito de negócio (validado no banco pelo usuário). Resíduo de
// notas PSAA/PSAI com o código "errado" (ex: PSAA com 0019 em vez de 0030) é
// desprezível (1-5 ocorrências) e não é tratado como caso especial.
// "default" reaproveita os códigos já configuráveis via .env pros outros 10
// serviços; produtividade0080 não tinha um campo próprio (era só um item da
// lista HIST_PRODUTIVIDADE_MEDIDAS), então fica fixo aqui.
const MAPEAMENTO_MEDIDA_POR_SERVICO = {
  default: {
    aprovacao: config.regrasHistorico.medidaAprovacao,
    comObras: config.regrasHistorico.liberacaoMedidas.comObras,
    semObras: config.regrasHistorico.liberacaoMedidas.semObras,
    produtividade0080: '0080',
  },
  PSAA: { aprovacao: '0030', comObras: '0591', semObras: '0551', produtividade0080: '0081' },
  PSAI: { aprovacao: '0031', comObras: '0591', semObras: '0551', produtividade0080: '0081' },
};

// Todos os códigos possíveis pra um conceito, juntando default + variações
// PSAA/PSAI (sem duplicar quando coincidem, ex: PSAA e PSAI usam o mesmo
// 0591 pra comObras). Usado pra montar um prefiltro IN() que não excluda
// nenhuma variação antes da classificação por linha.
function todosCodigosMedida(conceito, mapeamento = MAPEAMENTO_MEDIDA_POR_SERVICO) {
  const codigos = new Set([mapeamento.default[conceito]]);
  Object.keys(mapeamento).forEach((servico) => {
    if (servico !== 'default') codigos.add(mapeamento[servico][conceito]);
  });
  return [...codigos];
}

// Troca, numa lista de códigos canônicos (ex: filtro de medida da Produtividade,
// sempre em termos de COMT/etc.), os códigos que o serviço dado resolve
// diferente (ex: '0019'->'0030' e '0080'->'0081' pra PSAA), mantendo os
// demais (0032, 0020, 0021, 0086, 0800, ...) inalterados.
function substituirMedidasPorServico(medidas, servico, mapeamento = MAPEAMENTO_MEDIDA_POR_SERVICO) {
  const especifico = mapeamento[servico];
  if (!especifico) return medidas;
  const substituicoes = {
    [mapeamento.default.aprovacao]: especifico.aprovacao,
    [mapeamento.default.produtividade0080]: especifico.produtividade0080,
  };
  return medidas.map((codigo) => substituicoes[codigo] || codigo);
}

module.exports = { MAPEAMENTO_MEDIDA_POR_SERVICO, todosCodigosMedida, substituirMedidasPorServico };
