import { formatarDataHora } from '../utils/formatters.js';

export default function Header({ ultimaAtualizacao }) {
  const temAtualizacao =
    ultimaAtualizacao && (ultimaAtualizacao.DAT_ATUALIZA_DB1 || ultimaAtualizacao.DAT_ATUALIZA_DB2);

  return (
    <header className="app-header">
      <div className="app-header__brandbar" />
      <div className="app-header__content">
        <div className="app-header__title-group">
          <span className="app-header__eyebrow">Cemig · SAP / DB_SGO</span>
          <h1>Painel de Medidas Pendentes</h1>
        </div>
        {temAtualizacao && (
          <div className="app-header__atualizacao">
            Banco atualizado em: DB1 {formatarDataHora(ultimaAtualizacao.DAT_ATUALIZA_DB1)} · DB2{' '}
            {formatarDataHora(ultimaAtualizacao.DAT_ATUALIZA_DB2)}
          </div>
        )}
      </div>
    </header>
  );
}
