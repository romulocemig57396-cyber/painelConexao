import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HistoricoMesTick from './HistoricoMesTick.jsx';
import { formatarMesAno } from '../utils/formatters.js';
import { nomeMatricula } from '../config/matriculas.js';

// A matrícula que ocupa cada posição do ranking muda de mês a mês, então a
// cor aqui não identifica uma matrícula — identifica a posição (1º maior,
// 2º maior, ...). Rampa sequencial de um hue só (azul, claro→escuro, faixa
// 250-700 do palette.md da skill dataviz — piso de contraste ordinal em modo
// claro cumprido) para reforçar "maior volume = mais escuro"; "Outros" fica
// no cinza neutro (--text-muted), nunca ganhando uma cor gerada.
const CORES_RANKING = [
  '#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf',
  '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef',
];
const COR_OUTROS = '#898781';

function montarDados(linhas) {
  const porMes = new Map();
  linhas.forEach((linha) => {
    if (!porMes.has(linha.MES)) porMes.set(linha.MES, []);
    porMes.get(linha.MES).push(linha);
  });
  return [...porMes.keys()].sort().map((mes) => {
    const registros = porMes.get(mes);
    const linha = { mes, _detalhe: {} };
    registros.forEach((r) => {
      const chave = r.COD_RESP_CONC === 'OUTROS' ? 'outros' : `rank${r.RN}`;
      linha[chave] = r.QTD_CONCLUIDAS;
      linha._detalhe[chave] = { matricula: r.COD_RESP_CONC, qtd: r.QTD_CONCLUIDAS };
    });
    linha._total = registros.reduce((soma, r) => soma + r.QTD_CONCLUIDAS, 0);
    return linha;
  });
}

// Mostra o nome mapeado em config/matriculas.js quando existir; senão cai pro
// código puro (nomeMatricula já faz esse fallback).
function rotuloDetalhe(det) {
  return det.matricula === 'OUTROS' ? 'Outros' : nomeMatricula(det.matricula);
}

function corDaChave(chave) {
  if (chave === 'outros') return COR_OUTROS;
  const rank = Number(chave.replace('rank', ''));
  return CORES_RANKING[rank - 1] || COR_OUTROS;
}

function TooltipProdutividade({ active, payload, label, mesAtual }) {
  if (!active || !payload?.length) return null;
  const linha = payload[0]?.payload;
  const detalhes = Object.entries(linha?._detalhe || {}).sort(([, a], [, b]) => b.qtd - a.qtd);
  return (
    <div className="chart-tooltip">
      <strong>{formatarMesAno(label)}</strong>
      {label === mesAtual && <div className="chart-tooltip__aviso">Mês em andamento — dados parciais</div>}
      {detalhes.map(([chave, det]) => (
        <div key={chave} className="chart-tooltip__row">
          <span className="chart-tooltip__swatch" style={{ background: corDaChave(chave) }} />
          {rotuloDetalhe(det)}: {det.qtd}
        </div>
      ))}
      <div className="chart-tooltip__total">Total: {linha?._total ?? 0}</div>
    </div>
  );
}

export default function ProdutividadeBarChart({ titulo, linhas, topN, loading }) {
  if (loading) {
    return <div className="table-state">Carregando gráfico…</div>;
  }
  if (!linhas.length) {
    return <div className="table-state">Nenhum dado encontrado para o período.</div>;
  }

  const mesAtual = new Date().toISOString().slice(0, 7);
  const dados = montarDados(linhas);
  const temMesAtual = dados.some((d) => d.mes === mesAtual);
  const chaves = [...Array.from({ length: topN }, (_, i) => `rank${i + 1}`), 'outros'];

  return (
    <section className="chart-wrapper">
      <h2 className="chart-title">{titulo}</h2>
      <p className="chart-caption chart-caption--info">
        Top {topN} matrículas por mês, ordenadas da maior (mais escura) pra menor produção — o restante fica em
        "Outros" (cinza). Passe o mouse pra ver cada matrícula e a quantidade exata.
      </p>
      {temMesAtual && (
        <p className="chart-caption">
          * {formatarMesAno(mesAtual)} ainda está em andamento — volume parcial, não indica queda real.
        </p>
      )}
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={dados} barSize={28} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid vertical={false} stroke="var(--card-border)" />
          <XAxis
            dataKey="mes"
            tick={<HistoricoMesTick mesAtual={mesAtual} />}
            axisLine={{ stroke: 'var(--card-border)' }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<TooltipProdutividade mesAtual={mesAtual} />} cursor={{ fill: 'rgba(30, 90, 75, 0.06)' }} />
          {chaves.map((chave, index) => (
            <Bar
              key={chave}
              dataKey={chave}
              stackId="produtividade"
              fill={chave === 'outros' ? COR_OUTROS : CORES_RANKING[index]}
              stroke="#fff"
              strokeWidth={1}
              radius={index === chaves.length - 1 ? [4, 4, 0, 0] : 0}
            >
              {dados.map((linha) => (
                <Cell key={linha.mes} fillOpacity={linha.mes === mesAtual ? 0.55 : 1} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
