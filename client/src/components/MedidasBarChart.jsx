import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Paleta validada (dataviz skill, palette.md): slot 1 azul / slot 7 violeta —
// ΔE CVD 13.0, normal-vision 16.3, ambos acima dos pisos em modo claro.
const SITUACAO_META = {
  PENDENTES: { label: 'Pendentes', color: '#4a3aa7' },
  'EM ATRASO': { label: 'Em atraso', color: '#a02b2b' },
  'VENCE HOJE': { label: 'Vence hoje', color: '#8a5a0b' },
  'VENCE 7 DIAS': { label: 'Vence em até 7 dias', color: '#2a78d6' },
  'NO PRAZO': { label: 'No prazo', color: '#2f9e6e' },
  'SEM VENCIMENTO REGULATÓRIO': { label: 'Sem vencimento regulatório', color: '#898781' },
};
const COR_FALLBACK = '#898781';

function montarDadosGrafico(resumo, categorias, situacaoList, campoCategoria) {
  return categorias.map((categoria) => {
    const linha = { categoria };
    const bruto = {};
    situacaoList.forEach((situacao) => {
      const encontrado = resumo.find((r) => r[campoCategoria] === categoria && r.DES_SITUACAO === situacao);
      linha[situacao] = encontrado ? encontrado.QUANTIDADE : 0;
      bruto[situacao] = linha[situacao];
    });
    // Rótulos: % de cada situação dentro da barra e o total acima dela.
    linha._bruto = bruto;
    linha._total = Object.values(bruto).reduce((soma, qtd) => soma + qtd, 0);
    return linha;
  });
}

// Segmentos com menos de 5% do total da barra ficam sem rótulo (texto não caberia).
const PERCENTUAL_MINIMO_ROTULO = 5;

function calcularPercentualRotulo(situacao) {
  return (entry) => {
    const total = entry.payload?._total || 0;
    if (!total) return 0;
    return ((entry.payload?._bruto?.[situacao] || 0) / total) * 100;
  };
}

function renderRotuloPercentual(props) {
  const { x, y, width, height, value } = props;
  if (value == null || value < PERCENTUAL_MINIMO_ROTULO) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={11}
      fontWeight={600}
      pointerEvents="none"
    >
      {`${Math.round(value)}%`}
    </text>
  );
}

// O total fica preso à fatia do topo de cada barra (última situação com valor
// maior que zero): rótulo em fatia de altura zero não é desenhado.
function totalNoTopo(situacao, situacaoList) {
  return (entry) => {
    const bruto = entry.payload?._bruto || {};
    const topo = [...situacaoList].reverse().find((s) => (bruto[s] || 0) > 0);
    return topo === situacao ? (entry.payload?._total ?? 0) : null;
  };
}

function renderRotuloTotal(props) {
  const { x, y, width, value } = props;
  if (value == null) return null;
  return (
    <text x={x + width / 2} y={y - 8} fill="#374151" textAnchor="middle" fontSize={11} fontWeight={600} pointerEvents="none">
      {Number(value).toLocaleString('pt-BR')}
    </text>
  );
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

export default function MedidasBarChart({
  titulo,
  resumo,
  codigos,
  situacaoList,
  loading,
  categorias = codigos,
  campoCategoria = 'COD_MEDIDA',
  controlesFullscreen,
  cardsFullscreen,
}) {
  const [fullscreen, setFullscreen] = useState(false);

  if (loading) {
    return <div className="table-state">Carregando gráfico…</div>;
  }
  if (!categorias.length || !situacaoList.length) {
    return <div className="table-state">Nenhum dado para os filtros atuais.</div>;
  }

  const dados = montarDadosGrafico(resumo, categorias, situacaoList, campoCategoria);
  const totalGeral = dados.reduce(
    (soma, linha) => soma + situacaoList.reduce((s, situacao) => s + linha[situacao], 0),
    0,
  );

  if (totalGeral === 0) {
    return <div className="table-state">Nenhuma medida pendente encontrada para os filtros atuais.</div>;
  }

  const grafico = (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} barSize={24} margin={{ top: 28, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--card-border)" />
          <XAxis
            dataKey="categoria"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--card-border)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: 'rgba(30, 90, 75, 0.06)' }} />
          <Legend
            wrapperStyle={{ fontSize: 13, color: 'var(--text-muted)' }}
            formatter={(value) => SITUACAO_META[value]?.label || value}
          />
          {situacaoList.map((situacao, index) => {
            const ultima = index === situacaoList.length - 1;
            return (
              <Bar
                key={situacao}
                dataKey={situacao}
                name={situacao}
                stackId="medidas"
                fill={SITUACAO_META[situacao]?.color || COR_FALLBACK}
                stroke="#fff"
                strokeWidth={2}
                radius={ultima ? [4, 4, 0, 0] : 0}
              >
                <LabelList valueAccessor={calcularPercentualRotulo(situacao)} content={renderRotuloPercentual} />
                <LabelList valueAccessor={totalNoTopo(situacao, situacaoList)} content={renderRotuloTotal} />
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
  );

  const conteudo = (
    <>
      <div className={fullscreen ? 'chart-modal__header' : 'chart-header'}>
        <h2 className="chart-title">{titulo}</h2>
        <button
          type="button"
          className={fullscreen ? 'chart-modal__close' : 'chart-expand-btn'}
          onClick={() => setFullscreen(!fullscreen)}
          aria-label={fullscreen ? 'Fechar tela cheia' : 'Visualizar gráfico em tela cheia'}
          title={fullscreen ? 'Fechar tela cheia' : 'Visualizar em tela cheia'}
        >
          {fullscreen ? '×' : '⛶'}
        </button>
      </div>
      {fullscreen && controlesFullscreen && (
        <>
          <div className="chart-modal__cards">{cardsFullscreen}</div>
          <div className="chart-modal__filters">{controlesFullscreen}</div>
        </>
      )}
      <div className={fullscreen ? 'chart-modal__body' : 'chart-wrapper__body'}>{grafico}</div>
    </>
  );

  if (fullscreen) {
    return (
      <div className="chart-modal-overlay" role="dialog" aria-modal="true" aria-label={titulo}>
        <section className="chart-modal">{conteudo}</section>
      </div>
    );
  }

  return (
    <section className="chart-wrapper">
      {conteudo}
    </section>
  );
}
