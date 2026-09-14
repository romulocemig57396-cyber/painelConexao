import { formatarMesAno } from '../utils/formatters.js';

// XAxis tick compartilhado pelos gráficos da aba "Histórico" — sinaliza o mês
// atual (ainda em andamento, volume parcial) com um rótulo abaixo do mês.
export default function HistoricoMesTick({ x, y, payload, mesAtual }) {
  const atual = payload.value === mesAtual;
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        {formatarMesAno(payload.value)}
      </text>
      {atual && (
        <text dy={26} textAnchor="middle" fontSize={10} fontStyle="italic" fill="var(--late-text)">
          em andamento
        </text>
      )}
    </g>
  );
}
