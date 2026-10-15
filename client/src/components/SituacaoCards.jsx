// Contagem por situação (mesmas 6 categorias de SITUACOES_VENCIMENTO em
// App.jsx), com clique-isola — clicar de novo no card ativo limpa o filtro.
// Cores iguais às do painel externo (SITUACAO_META).
const SITUACAO_DEFS = [
  { situacao: 'PENDENTES', label: 'Pendentes', cor: '#4a3aa7' },
  { situacao: 'EM ATRASO', label: 'Em atraso', cor: '#a02b2b' },
  { situacao: 'VENCE HOJE', label: 'Vence hoje', cor: '#8a5a0b' },
  { situacao: 'VENCE 7 DIAS', label: 'Vence em até 7 dias', cor: '#2a78d6' },
  { situacao: 'NO PRAZO', label: 'No prazo', cor: '#2f9e6e' },
  { situacao: 'SEM VENCIMENTO REGULATÓRIO', label: 'Sem vencimento regulatório', cor: '#898781' },
];

export default function SituacaoCards({ rows, situacaoAtiva, onSituacaoClick }) {
  return (
    <section className="stat-cards stat-cards--situacao">
      {SITUACAO_DEFS.map((def) => {
        const quantidade = rows.filter((row) => row.DES_SITUACAO === def.situacao).length;
        const ativo = situacaoAtiva === def.situacao;

        return (
          <button
            key={def.situacao}
            type="button"
            className={`stat-card${ativo ? ' stat-card--ativo' : ''}`}
            onClick={() => onSituacaoClick(def.situacao)}
          >
            <div className="stat-card__head">
              <span className="stat-card__dot" style={{ background: def.cor }} />
              <span className="stat-card__label">{def.label}</span>
            </div>
            <p className="stat-card__value">{quantidade}</p>
          </button>
        );
      })}
    </section>
  );
}
