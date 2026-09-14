// De-para de matrícula -> nome, usado pra exibição (tooltip, legenda etc.) em
// vez do código puro. Adicione novas linhas aqui conforme for mapeando mais
// gente — matrícula sem entrada aqui continua aparecendo pelo código, sem quebrar nada.
const NOMES_POR_MATRICULA = {
  E247682: 'Alcimara',
  E246143: 'Andréa',
  E246007: 'Crisdálhia',
  E255922: 'Guilherme',
  E260491: 'Carolina',
  E267876: 'Leticia',
  E255114: 'Marina',
  C057396: 'Rômulo',
};

export function nomeMatricula(codigo) {
  return NOMES_POR_MATRICULA[codigo] || codigo;
}
