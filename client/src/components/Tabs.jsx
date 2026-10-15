const ABAS = [
  { key: 'historico', label: 'Histórico' },
  { key: 'medidas', label: 'Medidas Pendentes' },
  { key: 'inconsistencias', label: 'Inconsistências' },
  { key: 'orcamentos', label: 'Orçamentos Emitíveis' },
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
