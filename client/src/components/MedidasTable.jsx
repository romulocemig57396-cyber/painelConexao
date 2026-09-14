import { Fragment } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { formatarData } from '../utils/formatters.js';

export default function MedidasTable({ rows, loading }) {
  if (loading) {
    return <div className="table-state">Carregando medidas…</div>;
  }

  if (!rows.length) {
    return <div className="table-state">Nenhuma medida pendente encontrada para os filtros atuais.</div>;
  }

  return (
    <section className="table-wrapper">
      <table className="medidas-table">
        <thead>
          <tr>
            <th>Nota</th>
            <th>Criada em</th>
            <th>Serviço</th>
            <th>Obra / Endereço</th>
            <th>Medida</th>
            <th>Status</th>
            <th>Situação</th>
            <th>Vencimento</th>
            <th>Área resp.</th>
            <th>SAP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const temAlerta = row.TEM_PENDENCIA_GRUPO2 === 'SIM';
            const rowKey = `${row.NUM_NOTA}-${row.COD_MEDIDA}-${idx}`;
            return (
              <Fragment key={rowKey}>
                <tr className={temAlerta ? 'row--alert' : ''}>
                  <td>{row.NUM_NOTA}</td>
                  <td>{formatarData(row.DATA_CRIACAO_NOTA)}</td>
                  <td>
                    <span className="cell-primary">{row.COD_SERVICO}</span>
                    <span className="cell-secondary">{row.DES_SERVICO}</span>
                  </td>
                  <td>
                    <span className="cell-primary">{row.DES_OBRA || '—'}</span>
                    <span className="cell-secondary">{row.DES_ENDERECO_OBRA}</span>
                  </td>
                  <td>{row.COD_MEDIDA}</td>
                  <td>{row.COD_STAT_USU}</td>
                  <td>
                    <StatusBadge situacao={row.DES_SITUACAO} />
                  </td>
                  <td>{formatarData(row.DATA_VENCIMENTO)}</td>
                  <td>{row.COD_AREA_RESP || '—'}</td>
                  <td>
                    <a href={row.SAP_URL} target="_blank" rel="noreferrer" className="sap-link">
                      Abrir no SAP
                    </a>
                  </td>
                </tr>
                {temAlerta && (
                  <tr className="row--alert-note">
                    <td colSpan={10}>
                      <span className="alert-pill">Status das áreas envolvidas</span>
                      Nota {row.NUM_NOTA} também tem medida(s) pendente(s): {row.MEDIDAS_PENDENTES_GRUPO2}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
