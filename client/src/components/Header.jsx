export default function Header({ atualizacaoPublica, onAtualizarPublico }) {
  return (
    <header className="app-header">
      <div className="app-header__content">
        <div className="app-header__brand">
          <img src="/icons/icone-subestacao.svg" alt="" className="app-header__logo" />
          <div>
            <p className="app-header__nome">Conexão MT</p>
            <p className="app-header__sub">Painel interno</p>
          </div>
        </div>
        <div className="app-header__acoes">
          {atualizacaoPublica?.status === 'success' && <span>Atualizado com sucesso.</span>}
          {atualizacaoPublica?.status === 'error' && (
            <span>Falha ao atualizar o painel externo{atualizacaoPublica.error ? `: ${atualizacaoPublica.error}` : '.'}</span>
          )}
          <button
            type="button"
            className="app-header__botao-publico"
            onClick={onAtualizarPublico}
            disabled={atualizacaoPublica?.status === 'running'}
          >
            {atualizacaoPublica?.status === 'running' ? 'Atualizando painel externo…' : 'Atualizar painel externo'}
          </button>
        </div>
      </div>
    </header>
  );
}
