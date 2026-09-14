export default function ChipMultiFilter({ label, opcoes, selecionadas, onChange, wrapperClassName }) {
  if (!opcoes.length) return null;

  const todasSelecionadas = selecionadas.length === opcoes.length;

  function handleClickOpcao(valor, event) {
    const combinar = event.ctrlKey || event.metaKey;
    if (combinar) {
      onChange(
        selecionadas.includes(valor) ? selecionadas.filter((v) => v !== valor) : [...selecionadas, valor],
      );
      return;
    }
    // Clique simples isola: mostra só essa opção, desmarcando as demais.
    onChange([valor]);
  }

  return (
    <div className={wrapperClassName}>
      <label>{label}</label>
      <div className="chip-list">
        <button
          type="button"
          className={`chip chip--todos ${todasSelecionadas ? 'chip--ativo' : ''}`}
          onClick={() => onChange(opcoes)}
        >
          Todos
        </button>
        {opcoes.map((valor) => (
          <button
            key={valor}
            type="button"
            className={`chip ${selecionadas.includes(valor) ? 'chip--ativo' : ''}`}
            onClick={(event) => handleClickOpcao(valor, event)}
          >
            {valor}
          </button>
        ))}
      </div>
    </div>
  );
}
