const CARD_DEFS = [
  { key: 'analiseInicial', label: 'Análise Inicial', icon: '1', filterKey: 'analiseInicial', medidas: ['0019'] },
  {
    key: 'analiseConexao',
    label: 'Análise de Conexão',
    icon: '2',
    variant: 'late',
    filterKey: 'analiseConexao',
    medidas: ['0020', '0021'],
  },
  { key: 'orcamento', label: 'Orçamento', icon: '3', filterKey: 'orcamento', medidas: ['0080'] },
  {
    key: 'orcamentoEstimado',
    label: 'Orçamento Estimado',
    icon: '4',
    variant: 'alert',
    filterKey: 'orcamentoEstimado',
    medidas: ['0032', '0086'],
  },
];

export default function MetricCards({ metrics, loading, cardFiltroAtivo, onCardClick }) {
  return (
    <section className="metric-cards">
      {CARD_DEFS.map((def) => {
        const ativo = cardFiltroAtivo === def.filterKey;
        const classes = [
          'metric-card',
          'metric-card--clicavel',
          def.variant ? `metric-card--${def.variant}` : '',
          ativo ? 'metric-card--ativo' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={def.key}
            type="button"
            className={classes}
            onClick={() => onCardClick(def.filterKey, def.medidas)}
          >
            <div className="metric-card__icon">{def.icon}</div>
            <div className="metric-card__body">
              <span className="metric-card__value">{loading ? '—' : metrics[def.key]}</span>
              <span className="metric-card__label">{def.label}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
