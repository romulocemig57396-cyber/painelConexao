const VARIANTE_POR_TIPO = {
  'Medidas de resposta com status indevido': 'late',
  '0019/0032 concluída sem andamento': 'soon',
  '0020/0021 concluída sem andamento': 'blue',
  '0080/0086 concluída sem andamento': 'violet',
  '0080 pendente sem medida 0070': 'ontime',
};

export default function TipoInconsistenciaBadge({ tipo }) {
  const variante = VARIANTE_POR_TIPO[tipo] || 'neutral';
  return <span className={`badge badge--${variante}`}>{tipo}</span>;
}
