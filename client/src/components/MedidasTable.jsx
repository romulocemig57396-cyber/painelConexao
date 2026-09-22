import { Fragment, useMemo, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { formatarData } from '../utils/formatters.js';

const COLUNAS = [
  { chave: 'NUM_NOTA', rotulo: 'Nota', tipo: 'numero' },
  { chave: 'DATA_CRIACAO_NOTA', rotulo: 'Criada em', tipo: 'data' },
  { chave: 'COD_SERVICO', rotulo: 'Serviço', tipo: 'texto' },
  { chave: 'DES_OBRA', rotulo: 'Obra / Endereço', tipo: 'texto' },
  { chave: 'COD_MEDIDA', rotulo: 'Medida', tipo: 'texto' },
  { chave: 'COD_STAT_USU', rotulo: 'Status', tipo: 'texto' },
  { chave: 'DES_SITUACAO', rotulo: 'Situação', tipo: 'texto' },
  { chave: 'DATA_VENCIMENTO', rotulo: 'Vencimento', tipo: 'data' },
  { chave: 'COD_AREA_RESP', rotulo: 'Área resp.', tipo: 'texto' },
];

function compararValores(a, b, tipo) {
  if (tipo === 'data') {
    const da = a ? new Date(a).getTime() : NaN;
    const db = b ? new Date(b).getTime() : NaN;
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return da - db;
  }
  if (tipo === 'numero') {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { numeric: true });
}

export default function MedidasTable({ rows, loading }) {
  const [ordenacao, setOrdenacao] = useState({ chave: null, direcao: 'asc' });

  const linhasOrdenadas = useMemo(() => {
    if (!ordenacao.chave) return rows;
    const coluna = COLUNAS.find((c) => c.chave === ordenacao.chave);
    const sinal = ordenacao.direcao === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => sinal * compararValores(a[ordenacao.chave], b[ordenacao.chave], coluna.tipo));
  }, [rows, ordenacao]);

  function alternarOrdenacao(chave) {
    setOrdenacao((atual) => {
      if (atual.chave !== chave) return { chave, direcao: 'asc' };
      return { chave, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' };
    });
  }

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
            {COLUNAS.map((coluna) => {
              const ativa = ordenacao.chave === coluna.chave;
              return (
                <th key={coluna.chave}>
                  <button
                    type="button"
                    className={`th-sort${ativa ? ' th-sort--ativo' : ''}`}
                    onClick={() => alternarOrdenacao(coluna.chave)}
                    aria-label={`Ordenar por ${coluna.rotulo}`}
                  >
                    {coluna.rotulo}
                    <span className="th-sort__seta">{ativa ? (ordenacao.direcao === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </button>
                </th>
              );
            })}
            <th>SAP</th>
          </tr>
        </thead>
        <tbody>
          {linhasOrdenadas.map((row, idx) => {
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
