import ChipMultiFilter from './ChipMultiFilter.jsx';

export default function Filters({
  servicos,
  servicosSelecionados,
  onServicosChange,
  regionais,
  regionaisSelecionadas,
  onRegionaisChange,
  medidasGrupo1,
  medidasSelecionadas,
  onMedidasChange,
  situacoesVencimento,
  situacoesSelecionadas,
  onSituacoesChange,
  cardFiltroAtivo,
  onLimpar,
}) {
  const temFiltroAtivo =
    servicosSelecionados.length !== servicos.length ||
    regionaisSelecionadas.length !== regionais.length ||
    medidasSelecionadas.length !== medidasGrupo1.length ||
    situacoesSelecionadas.length !== situacoesVencimento.length ||
    cardFiltroAtivo;

  return (
    <section className="filters-bar">
      <ChipMultiFilter
        label="Regional"
        opcoes={regionais}
        selecionadas={regionaisSelecionadas}
        onChange={onRegionaisChange}
        wrapperClassName="filters-bar__field filters-bar__field--full"
      />
      <ChipMultiFilter
        label="Serviço"
        opcoes={servicos}
        selecionadas={servicosSelecionados}
        onChange={onServicosChange}
        wrapperClassName="filters-bar__field filters-bar__field--full"
      />
      <ChipMultiFilter
        label="Medidas (grupo 1)"
        opcoes={medidasGrupo1}
        selecionadas={medidasSelecionadas}
        onChange={onMedidasChange}
        wrapperClassName="filters-bar__field filters-bar__field--full"
      />
      <ChipMultiFilter
        label="Status de vencimento"
        opcoes={situacoesVencimento}
        selecionadas={situacoesSelecionadas}
        onChange={onSituacoesChange}
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
