import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Paleta validada (dataviz skill, palette.md): slot 1 azul / slot 7 violeta —
// ΔE CVD 13.0, normal-vision 16.3, ambos acima dos pisos em modo claro.
const SITUACAO_META = {
  PENDENTES: { label: 'Pendentes', color: '#4a3aa7' },
  'EM ATRASO': { label: 'Em atraso', color: '#a02b2b' },
  'VENCE HOJE': { label: 'Vence hoje', color: '#8a5a0b' },
  'VENCE 7 DIAS': { label: 'Vence em até 7 dias', color: '#2a78d6' },
  'NO PRAZO': { label: 'No prazo', color: '#2f9e6e' },
};
const COR_FALLBACK = '#898781';

function montarDadosGrafico(resumo, codigos, situacaoList) {
  return codigos.map((codMedida) => {
    const linha = { codMedida };
    situacaoList.forEach((situacao) => {
      const encontrado = resumo.find((r) => r.COD_MEDIDA === codMedida && r.DES_SITUACAO === situacao);
      linha[situacao] = encontrado ? encontrado.QUANTIDADE : 0;
    });
    return linha;
  });
}

function TooltipPersonalizado({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey} className="chart-tooltip__row">
          <span className="chart-tooltip__swatch" style={{ background: item.color }} />
          {SITUACAO_META[item.dataKey]?.label || item.dataKey}: {item.value}
        </div>
      ))}
    </div>
  );
}

export default function MedidasBarChart({ titulo, resumo, codigos, situacaoList, loading }) {
  if (loading) {
    return <div className="table-state">Carregando gráfico…</div>;
  }
  if (!codigos.length || !situacaoList.length) {
    return <div className="table-state">Nenhum dado para os filtros atuais.</div>;
  }

  const dados = montarDadosGrafico(resumo, codigos, situacaoList);
  const totalGeral = dados.reduce(
    (soma, linha) => soma + situacaoList.reduce((s, situacao) => s + linha[situacao], 0),
    0,
  );

  if (totalGeral === 0) {
    return <div className="table-state">Nenhuma medida pendente encontrada para os filtros atuais.</div>;
  }

  return (
    <section className="chart-wrapper">
      <h2 className="chart-title">{titulo}</h2>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={dados} barSize={24} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--card-border)" />
          <XAxis
            dataKey="codMedida"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--card-border)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: 'rgba(30, 90, 75, 0.06)' }} />
          <Legend
            wrapperStyle={{ fontSize: 13, color: 'var(--text-muted)' }}
            formatter={(value) => SITUACAO_META[value]?.label || value}
          />
          {situacaoList.map((situacao, index) => (
            <Bar
              key={situacao}
              dataKey={situacao}
              name={situacao}
              stackId="medidas"
              fill={SITUACAO_META[situacao]?.color || COR_FALLBACK}
              stroke="#fff"
              strokeWidth={2}
              radius={index === situacaoList.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
