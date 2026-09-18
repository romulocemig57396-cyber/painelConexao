const ABAS = [
  { key: 'lista', label: 'Lista' },
  { key: 'graficos', label: 'Gráficos' },
  { key: 'inconsistencias', label: 'Inconsistências' },
  { key: 'historico', label: 'Histórico' },
  { key: 'orcamentos', label: 'Orçamentos emitíveis' },
];

export default function Tabs({ abaAtiva, onChange }) {
  return (
    <div className="tabs-bar" role="tablist">
      {ABAS.map((aba) => (
        <button
          key={aba.key}
          type="button"
          role="tab"
          aria-selected={abaAtiva === aba.key}
          className={`tabs-bar__item ${abaAtiva === aba.key ? 'tabs-bar__item--ativa' : ''}`}
          onClick={() => onChange(aba.key)}
        >
          {aba.label}
        </button>
      ))}
    </div>
  );
}
