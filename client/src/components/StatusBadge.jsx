function situacaoParaVariante(situacao) {
  const texto = (situacao || '').toUpperCase();
  if (texto.includes('ATRASO')) return 'late';
  if (texto.includes('VENCE')) return 'soon';
  if (texto.includes('PRAZO')) return 'ontime';
  return 'neutral';
}

export default function StatusBadge({ situacao }) {
  const variante = situacaoParaVariante(situacao);
  return <span className={`badge badge--${variante}`}>{situacao || '—'}</span>;
}
