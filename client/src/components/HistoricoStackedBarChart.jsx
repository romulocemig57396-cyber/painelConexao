import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HistoricoMesTick from './HistoricoMesTick.jsx';
import { formatarMesAno } from '../utils/formatters.js';

// Backend manda contagens brutas por MES/categoria. A altura da barra usa a
// quantidade bruta (barra proporcional ao volume do mês); o percentual dentro
// do total do mês é calculado à parte, para o rótulo e o tooltip.
function montarDados(linhas, categorias, campoCategoria, campoQtd) {
  const porMes = new Map();
  linhas.forEach((linha) => {
    const mes = linha.MES;
    if (!porMes.has(mes)) porMes.set(mes, {});
    porMes.get(mes)[linha[campoCategoria]] = linha[campoQtd];
  });
  return [...porMes.keys()].sort().map((mes) => {
    const bruto = porMes.get(mes);
    const total = categorias.reduce((soma, cat) => soma + (bruto[cat.key] || 0), 0);
    const linha = { mes, _bruto: bruto, _total: total };
    categorias.forEach((cat) => {
      linha[cat.key] = bruto[cat.key] || 0;
    });
    return linha;
  });
}

// Segmentos com menos de 5% do total do mês ficam sem rótulo (texto não caberia).
const PERCENTUAL_MINIMO_ROTULO = 5;

function calcularPercentualRotulo(catKey) {
  return (entry) => {
    const total = entry.payload?._total || 0;
    if (!total) return 0;
    return ((entry.payload?._bruto?.[catKey] || 0) / total) * 100;
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
      fontSize={12}
      fontWeight={600}
      pointerEvents="none"
    >
      {`${Math.round(value)}%`}
    </text>
  );
}

// Rótulo do total do mês, acima do topo da barra empilhada. Cor neutra do
// tema (não branco, para não competir com os rótulos internos) e fonte menor.
function renderRotuloTotal(props) {
  const { x, y, width, value } = props;
  if (value == null) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="var(--text-body)"
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      pointerEvents="none"
    >
      {Number(value).toLocaleString('pt-BR')}
    </text>
  );
}

function totalDoMes(entry) {
  return entry.payload?._total ?? 0;
}

function IconeExpandir() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function IconeFechar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TooltipHistorico({ active, payload, label, categorias, mesAtual }) {
  if (!active || !payload?.length) return null;
  const linha = payload[0]?.payload;
  return (
    <div className="chart-tooltip">
      <strong>{formatarMesAno(label)}</strong>
      {label === mesAtual && <div className="chart-tooltip__aviso">Mês em andamento — dados parciais</div>}
      {categorias.map((cat) => {
        const qtd = linha?._bruto?.[cat.key] || 0;
        const pct = linha?._total ? (qtd / linha._total) * 100 : 0;
        return (
          <div key={cat.key} className="chart-tooltip__row">
            <span className="chart-tooltip__swatch" style={{ background: cat.color }} />
            {cat.label}: {qtd} ({pct.toFixed(1)}%)
          </div>
        );
      })}
      <div className="chart-tooltip__total">Total: {linha?._total ?? 0}</div>
    </div>
  );
}

function GraficoHistorico({ dados, categorias, mesAtual, altura }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} barSize={28} margin={{ top: 28, right: 16, left: 0, bottom: 20 }}>
        <CartesianGrid vertical={false} stroke="var(--card-border)" />
        <XAxis
          dataKey="mes"
          tick={<HistoricoMesTick mesAtual={mesAtual} />}
          axisLine={{ stroke: 'var(--card-border)' }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          domain={[0, 'auto']}
          allowDecimals={false}
          tickFormatter={(v) => v.toLocaleString('pt-BR')}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
          label={{
            value: 'Quantidade',
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--text-muted)',
            fontSize: 12,
          }}
        />
        <Tooltip
          content={<TooltipHistorico categorias={categorias} mesAtual={mesAtual} />}
          cursor={{ fill: 'rgba(30, 90, 75, 0.06)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, color: 'var(--text-muted)' }}
          formatter={(value) => categorias.find((cat) => cat.key === value)?.label || value}
        />
        {categorias.map((cat, index) => {
          const ultima = index === categorias.length - 1;
          return (
            <Bar
              key={cat.key}
              dataKey={cat.key}
              name={cat.key}
              stackId="historico"
              fill={cat.color}
              stroke="#fff"
              strokeWidth={2}
              radius={ultima ? [4, 4, 0, 0] : 0}
            >
              {dados.map((linha) => (
                <Cell key={linha.mes} fillOpacity={linha.mes === mesAtual ? 0.55 : 1} />
              ))}
              <LabelList valueAccessor={calcularPercentualRotulo(cat.key)} content={renderRotuloPercentual} />
              {ultima && <LabelList valueAccessor={totalDoMes} content={renderRotuloTotal} />}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function HistoricoStackedBarChart({ titulo, linhas, categorias, campoCategoria, loading }) {
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (!expandido) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setExpandido(false);
    };
    document.addEventListener('keydown', aoTeclar);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowOriginal;
    };
  }, [expandido]);

  if (loading) {
    return <div className="table-state">Carregando gráfico…</div>;
  }
  if (!linhas.length) {
    return <div className="table-state">Nenhum dado encontrado para o período.</div>;
  }

  const mesAtual = new Date().toISOString().slice(0, 7);
  const dados = montarDados(linhas, categorias, campoCategoria, 'QTD');
  const temMesAtual = dados.some((d) => d.mes === mesAtual);
  const aviso = temMesAtual && (
    <p className="chart-caption">
      * {formatarMesAno(mesAtual)} ainda está em andamento — volume parcial, não indica queda real.
    </p>
  );

  return (
    <section className="chart-wrapper">
      <div className="chart-header">
        <h2 className="chart-title">{titulo}</h2>
        <button
          type="button"
          className="chart-expand-btn"
          onClick={() => setExpandido(true)}
          aria-label={`Expandir gráfico: ${titulo}`}
          title="Tela cheia"
        >
          <IconeExpandir />
        </button>
      </div>
      {aviso}
      <GraficoHistorico dados={dados} categorias={categorias} mesAtual={mesAtual} altura={360} />

      {expandido &&
        createPortal(
          <div className="chart-modal-overlay" onClick={() => setExpandido(false)}>
            <div className="chart-modal" onClick={(evento) => evento.stopPropagation()}>
              <div className="chart-modal__header">
                <h2 className="chart-title">{titulo}</h2>
                <button
                  type="button"
                  className="chart-modal__close"
                  onClick={() => setExpandido(false)}
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <IconeFechar />
                </button>
              </div>
              {aviso}
              <div className="chart-modal__body">
                <GraficoHistorico dados={dados} categorias={categorias} mesAtual={mesAtual} altura="100%" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
