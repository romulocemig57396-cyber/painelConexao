export function formatarData(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Formata uma chave de mês no formato 'yyyy-MM' (ex: FORMAT(DAT_TREAL, 'yyyy-MM') do backend).
export function formatarMesAno(mes) {
  const [ano, m] = mes.split('-');
  return `${NOMES_MES[Number(m) - 1]}/${ano.slice(2)}`;
}

export function formatarDataHora(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  const dataFmt = data.toLocaleDateString('pt-BR');
  const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFmt} ${horaFmt}`;
}
