import ChipMultiFilter from './ChipMultiFilter.jsx';

export default function Filters({
  servicos,
  servicosSelecionados,
  onServicosChange,
  regionais,
  regionaisSelecionadas,
  onRegionaisChange,
  tiposSolicitacao,
  tiposSolicitacaoSelecionados,
  onTiposSolicitacaoChange,
  classes,
  classesSelecionadas,
  onClassesChange,
  faixasCaixas,
  faixasCaixasSelecionadas,
  onFaixasCaixasChange,
  universalizacoes,
  universalizacoesSelecionadas,
  onUniversalizacoesChange,
  rotulosUniversalizacao,
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
    tiposSolicitacaoSelecionados.length !== tiposSolicitacao.length ||
    classesSelecionadas.length !== classes.length ||
    faixasCaixasSelecionadas.length !== faixasCaixas.length ||
    universalizacoesSelecionadas.length !== universalizacoes.length ||
    medidasSelecionadas.length !== medidasGrupo1.length ||
    situacoesSelecionadas.length !== situacoesVencimento.length ||
    cardFiltroAtivo;

  return (
    <section className="filters-bar">
      <ChipMultiFilter
        label="Serviço"
        opcoes={servicos}
        selecionadas={servicosSelecionados}
        onChange={onServicosChange}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Regional"
        opcoes={regionais}
        selecionadas={regionaisSelecionadas}
        onChange={onRegionaisChange}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Tipo de solicitação"
        opcoes={tiposSolicitacao}
        selecionadas={tiposSolicitacaoSelecionados}
        onChange={onTiposSolicitacaoChange}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Classe"
        opcoes={classes}
        selecionadas={classesSelecionadas}
        onChange={onClassesChange}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Número de caixas"
        opcoes={faixasCaixas}
        selecionadas={faixasCaixasSelecionadas}
        onChange={onFaixasCaixasChange}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Universalização"
        opcoes={universalizacoes}
        selecionadas={universalizacoesSelecionadas}
        onChange={onUniversalizacoesChange}
        rotulos={rotulosUniversalizacao}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Medidas (grupo 1)"
        opcoes={medidasGrupo1}
        selecionadas={medidasSelecionadas}
        onChange={onMedidasChange}
        wrapperClassName="filters-bar__field"
      />
      <ChipMultiFilter
        label="Status de vencimento"
        opcoes={situacoesVencimento}
        selecionadas={situacoesSelecionadas}
        onChange={onSituacoesChange}
        wrapperClassName="filters-bar__field"
      />
      {temFiltroAtivo && (
        <button type="button" className="filters-bar__clear" onClick={onLimpar}>
          Limpar filtros
        </button>
      )}
    </section>
  );
}
