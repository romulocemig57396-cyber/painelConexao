# Changelog

Mudanças relevantes do Painel de Medidas Pendentes. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado
- Filtro **Universalização** (Universalizada, Não universalizada, Fora da
  universalização, Obras de segurança e Outros) nas abas Medidas Pendentes
  (inclusive no modo tela cheia dos gráficos) e Histórico, ao lado de classe e
  número de caixas. Parâmetro `universalizacao` em todas as rotas que já
  aceitam `tipoSolicitacao`/`classe`/`faixaCaixas` (`/api/historico/*`,
  `/api/historico/valor-obra` e `/api/medidas/*`): ausente = sem filtro; lista
  vazia = resposta vazia sem consultar o banco; valor inválido no Histórico =
  erro 400.
- Filtro **Universalização** também no **painel externo** (Histórico e Medidas
  Pendentes): a exportação passa a enviar `universalizacao` em cada linha
  (histórico, medidas, medida 0070 por regional e valor da obra) e o Portal ganhou
  a coluna, a migração e o chip. O card "Valor da obra" acompanha o filtro. É
  preciso rodar "Atualizar painel externo" para os dados novos chegarem; sem isso
  o chip aparece, mas todas as linhas antigas ficam em "Outros".
- `universalizacaoDisponiveis` em `regrasNegocio` e `regrasHistorico` (config).
- Parâmetro opcional `rotulos` no `ChipMultiFilter` (texto exibido diferente do
  valor enviado à API).
- Testes automáticos (`npm test` em `server/`, `node --test`) e seções "Filtros
  do painel" e "Testes" no README, com consulta de conferência para o DBeaver.

### Alterado
- O gráfico "Universalização de obras" passou a usar `universalizacaoCase()`
  (`server/src/queries/tipoSolicitacao.js`), a mesma expressão do filtro, tanto
  na consulta do painel quanto na da exportação. O SQL gerado sem o filtro é
  idêntico ao anterior.
