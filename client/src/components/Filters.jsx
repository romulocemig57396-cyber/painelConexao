import ChipMultiFilter from './ChipMultiFilter.jsx';

export default function Filters({
  areas,
  statusList,
  areaSelecionada,
  statusSelecionado,
  onAreaChange,
  onStatusChange,
  medidasGrupo1,
  medidasSelecionadas,
  onMedidasChange,
  cardFiltroAtivo,
  onLimpar,
}) {
  const temFiltroAtivo =
    areaSelecionada ||
    statusSelecionado ||
    medidasSelecionadas.length !== medidasGrupo1.length ||
    cardFiltroAtivo;

  return (
    <section className="filters-bar">
      <div className="filters-bar__field">
        <label htmlFor="filtro-area">Área responsável</label>
        <select id="filtro-area" value={areaSelecionada} onChange={(e) => onAreaChange(e.target.value)}>
          <option value="">Todas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>
      <div className="filters-bar__field">
        <label htmlFor="filtro-status">Status</label>
        <select id="filtro-status" value={statusSelecionado} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">Todos</option>
          {statusList.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <ChipMultiFilter
        label="Medidas (grupo 1) — clique isola, Ctrl/Cmd+clique combina"
        opcoes={medidasGrupo1}
        selecionadas={medidasSelecionadas}
        onChange={onMedidasChange}
        wrapperClassName="filters-bar__field filters-bar__field--full"
      />
      {temFiltroAtivo && (
        <button type="button" className="filters-bar__clear" onClick={onLimpar}>
          Limpar filtros
        </button>
      )}
    </section>
  );
}
