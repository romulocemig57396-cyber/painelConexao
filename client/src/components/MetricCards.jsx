const CARD_DEFS = [
  { key: 'analiseInicial', label: 'Análise Inicial', filterKey: 'analiseInicial', medidas: ['0019'] },
  {
    key: 'analiseConexao',
    label: 'Análise de Conexão',
    variant: 'late',
    filterKey: 'analiseConexao',
    medidas: ['0020', '0021'],
  },
  { key: 'orcamento', label: 'Orçamento', filterKey: 'orcamento', medidas: ['0080'] },
  {
    key: 'orcamentoEstimado',
    label: 'Orçamento Estimado',
    variant: 'alert',
    filterKey: 'orcamentoEstimado',
    medidas: ['0032', '0086'],
  },
];

export default function MetricCards({ metrics, loading, cardFiltroAtivo, onCardClick }) {
  return (
    <section className="stat-cards">
      {CARD_DEFS.map((def) => {
        const ativo = cardFiltroAtivo === def.filterKey;
        const classes = [
          'stat-card',
          def.variant ? `stat-card--${def.variant}` : '',
          ativo ? 'stat-card--ativo' : '',
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
            <div className="stat-card__head">
              <span className="stat-card__dot" />
              <span className="stat-card__label">{def.label}</span>
            </div>
            <p className="stat-card__value">{loading ? '—' : metrics[def.key]}</p>
          </button>
        );
      })}
    </section>
  );
}
