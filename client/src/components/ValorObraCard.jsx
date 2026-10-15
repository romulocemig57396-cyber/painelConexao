const formatadorReal = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

// Total do valor da obra (TBL_OBRA_CUSTOS.VAL_TOTAL_OBRA, uma vez por nota) das
// obras que estão no gráfico de medidas pendentes com os filtros atuais.
export default function ValorObraCard({ valorObra, loading }) {
  const notas = valorObra?.notas ?? 0;
  return (
    <section className="metric-cards">
      <div className="metric-card">
        <div className="metric-card__icon">R$</div>
        <div className="metric-card__body">
          <span className="metric-card__value">
            {loading ? '—' : formatadorReal.format(valorObra?.valorObra ?? 0)}
          </span>
          <span className="metric-card__label">
            Valor da obra{loading ? '' : ` — ${notas.toLocaleString('pt-BR')} obras no gráfico`}
          </span>
        </div>
      </div>
    </section>
  );
}
