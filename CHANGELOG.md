# Changelog

Mudanças relevantes do Painel de Medidas Pendentes. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado
- Filtro **Universalização** (Universalizada, Não universalizada, Fora da
  universalização, Obras de segurança e Outros) na aba Histórico, ao lado de
  classe e número de caixas. Parâmetro `universalizacao` em todas as rotas que já
  aceitam `tipoSolicitacao`/`classe`/`faixaCaixas` (`/api/historico/*`,
  `/api/historico/valor-obra`): ausente = sem filtro; lista
  vazia = resposta vazia sem consultar o banco; valor inválido no Histórico =
  erro 400.
- Filtro **Universalização** também no **painel externo** (aba Histórico): a
  exportação passa a enviar `universalizacao` nas linhas do histórico e do valor da
  obra e o Portal ganhou a coluna, a migração e o chip. O card "Valor da obra"
  acompanha o filtro. É
  preciso rodar "Atualizar painel externo" para os dados novos chegarem; sem isso
  o chip aparece, mas todas as linhas antigas ficam em "Outros".
- `universalizacaoDisponiveis` em `regrasNegocio` e `regrasHistorico` (config).
- Parâmetro opcional `rotulos` no `ChipMultiFilter` (texto exibido diferente do
  valor enviado à API).
- Testes automáticos (`npm test` em `server/`, `node --test`) e seções "Filtros
  do painel" e "Testes" no README, com consulta de conferência para o DBeaver.

### Removido
- **Medidas Pendentes**: o card "Valor da obra" e o filtro Universalização saíram da
  aba (interno e externo); continuam só no Histórico. Rota
  `/api/medidas/valor-obra` removida e `universalizacao` ignorado em `/api/medidas*`.
  Motivo: a aba carregava o card junto com os dados (`Promise.all`), então uma falha
  ou lentidão da consulta de valor da obra deixava a tabela/gráficos
  desatualizados ou vazios, além da consulta extra pesada.

### Corrigido
- Inconsistências, tipo 1 ("Medidas de resposta com status indevido"): a regra
  "status diferente de ENCE/CONC" usava igualdade exata, mas `COD_STAT_USU` é
  composto (ex.: `CONC PCOR`), então medidas já concluídas entravam na lista (milhares
  de notas). Agora a checagem é por palavra inteira, como nas demais regras.

### Alterado
- O gráfico "Universalização de obras" passou a usar `universalizacaoCase()`
  (`server/src/queries/tipoSolicitacao.js`), a mesma expressão do filtro, tanto
  na consulta do painel quanto na da exportação. O SQL gerado sem o filtro é
  idêntico ao anterior.
