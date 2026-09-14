const CARD_DEFS = [
  { key: 'totalPendentes', label: 'Total pendentes', icon: '1', filterKey: 'total' },
  { key: 'emAtraso', label: 'Em atraso', icon: '2', variant: 'late', filterKey: 'atraso' },
  { key: 'areasEnvolvidas', label: 'Áreas envolvidas', icon: '3', variant: 'alert', filterKey: 'grupo2' },
];

export default function MetricCards({ metrics, loading, cardFiltroAtivo, onCardClick }) {
  return (
    <section className="metric-cards">
      {CARD_DEFS.map((def) => {
        const ativo = def.filterKey === 'total' ? !cardFiltroAtivo : cardFiltroAtivo === def.filterKey;
        const classes = [
          'metric-card',
          'metric-card--clicavel',
          def.variant ? `metric-card--${def.variant}` : '',
          ativo ? 'metric-card--ativo' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button key={def.key} type="button" className={classes} onClick={() => onCardClick(def.filterKey)}>
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
