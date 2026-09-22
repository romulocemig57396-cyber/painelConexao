// Contagem por situação (mesmas 6 categorias de SITUACOES_VENCIMENTO em
// App.jsx), com o mesmo comportamento de clique-isola dos MetricCards da
// aba Lista — clicar de novo no card ativo limpa o filtro.
const SITUACAO_DEFS = [
  { situacao: 'PENDENTES', label: 'Pendentes', icone: 'P' },
  { situacao: 'EM ATRASO', label: 'Em atraso', icone: '!', variant: 'late' },
  { situacao: 'VENCE HOJE', label: 'Vence hoje', icone: 'H', variant: 'soon' },
  { situacao: 'VENCE 7 DIAS', label: 'Vence em até 7 dias', icone: '7', variant: 'soon' },
  { situacao: 'NO PRAZO', label: 'No prazo', icone: '✓', variant: 'ontime' },
  { situacao: 'SEM VENCIMENTO REGULATÓRIO', label: 'Sem vencimento regulatório', icone: '—' },
];

export default function SituacaoCards({ rows, situacaoAtiva, onSituacaoClick }) {
  return (
    <section className="metric-cards">
      {SITUACAO_DEFS.map((def) => {
        const quantidade = rows.filter((row) => row.DES_SITUACAO === def.situacao).length;
        const ativo = situacaoAtiva === def.situacao;
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
            key={def.situacao}
            type="button"
            className={classes}
            onClick={() => onSituacaoClick(def.situacao)}
          >
            <div className="metric-card__icon">{def.icone}</div>
            <div className="metric-card__body">
              <span className="metric-card__value">{quantidade}</span>
              <span className="metric-card__label">{def.label}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
