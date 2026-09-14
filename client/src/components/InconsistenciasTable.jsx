import TipoInconsistenciaBadge from './TipoInconsistenciaBadge.jsx';
import { formatarData } from '../utils/formatters.js';

export default function InconsistenciasTable({ rows, loading }) {
  if (loading) {
    return <div className="table-state">Carregando inconsistências…</div>;
  }

  if (!rows.length) {
    return <div className="table-state">Nenhuma inconsistência encontrada para os filtros atuais.</div>;
  }

  return (
    <section className="table-wrapper">
      <table className="medidas-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Nota</th>
            <th>Serviço</th>
            <th>Criada em</th>
            <th>Status da nota</th>
            <th>Medida</th>
            <th>Status medida</th>
            <th>SAP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.NUM_NOTA}-${row.COD_MEDIDA}-${idx}`}>
              <td>
                <TipoInconsistenciaBadge tipo={row.TIPO_INCONSISTENCIA} />
              </td>
              <td>{row.NUM_NOTA}</td>
              <td>{row.COD_SERVICO}</td>
              <td>{formatarData(row.DAT_CRIACAO)}</td>
              <td>{row.COD_STATUS_USU_NOTA}</td>
              <td>{row.COD_MEDIDA}</td>
              <td>{row.COD_STAT_USU}</td>
              <td>
                <a href={row.SAP_URL} target="_blank" rel="noreferrer" className="sap-link">
                  Abrir no SAP
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
