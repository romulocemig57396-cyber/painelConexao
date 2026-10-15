const formatadorReal = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

// Total do valor da obra (TBL_OBRA_CUSTOS.VAL_TOTAL_OBRA, uma vez por nota) das
// obras que estão no gráfico, com os filtros atuais.
export default function ValorObraCard({ valorObra, loading }) {
  const notas = valorObra?.notas ?? 0;
  return (
    <div className="valor-obra-grid">
      <div className="valor-obra-card">
        <p className="valor-obra-card__label">Valor da obra</p>
        <p className="valor-obra-card__value">{loading ? '—' : formatadorReal.format(valorObra?.valorObra ?? 0)}</p>
        <p className="valor-obra-card__sub">{loading ? '' : `${notas.toLocaleString('pt-BR')} obras no gráfico`}</p>
      </div>
    </div>
  );
}
