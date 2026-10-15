# Remoção do painel externo — levantamento

Levantamento (somente leitura) do que existe por causa do painel externo, para
quando o painel interno for hospedado na rede interna e o externo for apagado.
**Nada disto foi removido ainda.**

Repositórios envolvidos:

- `painelConexao` (painel interno, este repositório)
- `portal-conexao-mt` (Portal, onde mora o painel externo)

## Ponto de atenção sobre a ordem

Se o botão e a exportação saírem do painel interno **antes** de o painel externo
ser apagado, os dados do externo ficam congelados no último envio. Faz sentido
só quando não houver mais interesse em atualizar o externo.

## 1) painelConexao — existe só por causa do externo

### Tela (client)

- [ ] Botão "Atualizar painel externo" e as mensagens de sucesso/erro:
      `client/src/components/Header.jsx`.
- [ ] `client/src/App.jsx`: função `atualizarPainelPublico`, estado
      `atualizacaoPublica` e o efeito que consulta o andamento a cada 3 segundos.
- [ ] Comentários que citam o painel externo (`ValorObraCard.jsx`,
      `SituacaoCards.jsx`, `MedidasBarChart.jsx`, `Tabs.jsx`, `App.jsx`).

### Servidor

- [ ] `server/src/routes/painelPublico.js` e `server/src/services/painelPublico.js`,
      mais o registro em `server/src/index.js`.
      A rota `POST /api/painel-publico/atualizar` hoje **não exige login**.
- [ ] `server/scripts/exportarPainelExterno.js`.
- [ ] `server/src/queries/medidasPublicoResumo.js` (arquivo inteiro).
- [ ] Funções "granulares", que agrupam por todas as combinações de filtro para
      enviar ao Portal:
  - `buscarHistoricoAprovacaoGranular`, `buscarHistoricoLiberacaoGranular`,
    `buscarHistoricoUniversalizacaoGranular`
  - `buscarValorObraAprovacaoGranular`, `buscarValorObraLiberacaoGranular`,
    `buscarValorObraUniversalizacaoGranular`
  - `buscarResumoMedida0070RegionalGranular`
- [ ] `COLUNAS_SOLICITACAO` (`server/src/queries/tipoSolicitacao.js`) e
      `DIMENSOES_FILTROS` (`server/src/queries/valorObra.js`): usados só pelas
      consultas acima.

**Ficam** (o painel interno usa): as consultas normais dos gráficos, incluindo as
que somam o valor da obra para os cards, `buscarInconsistencias`,
`buscarOrcamentosEmitiveis`, `tipoSolicitacao.js` e `valorObra.js`.

### Arquivos soltos

- [ ] `atualizar_historico.bat` e `atualizar_historico_publico.bat` (só chamam a
      exportação).
- [ ] `PUBLICACAO.md`.
- [ ] `server/.env.example`: bloco `PORTAL_PAINEL_EXTERNO_URL`.

## 2) portal-conexao-mt — sai junto com o externo

- [ ] Páginas e rotas: `src/app/painel-externo/page.tsx`,
      `src/app/api/painel-externo/route.ts`,
      `src/app/api/painel-externo/atualizar/route.ts`.
- [ ] Componentes: pasta `src/components/painel-externo/` (8 arquivos) e
      `src/lib/tiposSolicitacaoPainel.ts`.
- [ ] Card "Painel externo" na home: `src/lib/cards.ts`.
- [ ] Exceção `api/painel-externo/atualizar` no matcher de `src/proxy.ts`
      (a de `api/resumo-diario/atualizar` fica).
- [ ] `src/lib/db.ts`: as 7 tabelas `painel_externo_*`, os tipos `PainelExterno*`,
      as migrações (`ALTER TABLE`), `substituirPainelExterno`,
      `getPainelExternoCompleto` e as constantes de valor padrão.
- [ ] As tabelas ficam órfãs no Turso: precisa de `DROP TABLE IF EXISTS`
      explícito para cada `painel_externo_*`.
- [ ] Papel "externo": as contas desse papel ficam sem utilidade. **Não remover o
      papel** do código (o banco exige recriar a tabela de usuários); o mais
      seguro é desativar essas contas.

## 3) Parece do externo, mas é independente

- **Resumo diário**: `server/scripts/resumo-diario.js` e as variáveis
  `PORTAL_RESUMO_URL` / `PORTAL_RESUMO_API_KEY` alimentam o resumo diário da
  home do Portal. Não têm relação com o painel externo. Manter se o Portal
  continuar.
- **`server/src/confiarCertificadosWindows.js` e a dependência `win-ca`**: hoje só
  servem às chamadas HTTPS ao Portal (exportação e resumo diário). Se os dois
  saírem, eles saem também.
- **`iniciar-painel.bat` e `registrar-protocolo-painelmedidas.bat`**: não ligam
  ao externo. Só ficam obsoletos quando o painel interno for hospedado.
- **Chave `PORTAL_RESUMO_API_KEY` no Railway**: continua usada pelo resumo diário.

## Ordem sugerida

1. Migrar o painel interno para a hospedagem interna.
2. Garantir que quem usava o externo consegue acessar o interno.
3. Remover o grupo 1 (painelConexao) e, no mesmo momento, o grupo 2 (Portal).
4. Rodar os `DROP TABLE` no Turso e desativar as contas de papel "externo".
