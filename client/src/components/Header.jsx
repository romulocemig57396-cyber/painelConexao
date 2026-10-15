export default function Header() {
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
      </div>
    </header>
  );
}
