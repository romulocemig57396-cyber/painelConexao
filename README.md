# Painel de Medidas Pendentes

App para a equipe acompanhar medidas pendentes vinculadas a notas SAP, lendo direto do SQL Server `DB_SGO`.

- **Backend**: Node.js + Express + [`mssql`](https://www.npmjs.com/package/mssql) (`server/`)
- **Frontend**: React + Vite, sem Streamlit/Python (`client/`)

## 1. Configurar o backend

```
cd server
copy .env.example .env
```

Edite `server/.env` com os dados reais de conexão:

```
DB_SERVER=host,porta
DB_NAME=DB_SGO
DB_USER=usuario
DB_PWD=senha
DB_ENCRYPT=false
DB_TRUST_CERT=true
PORT=3001
```

Os grupos de medidas, status considerados "pendente" e os `COD_SERVICO` filtrados também
são configuráveis no `.env` (`GRUPO1_MEDIDAS`, `GRUPO2_MEDIDAS`, `STATUS_PENDENTE`,
`COD_SERVICO_FILTRO`). Por padrão, o painel usa os mesmos tipos de serviço disponíveis
na aba Histórico (`COMT`, `COBT`, `PSAA`, `PSER`, `PSAC`, `PSRP`, `PSAG`, `PSAI`,
`PSAF`, `PSSG`, `PSIP` e `PSST`).

Dependências já instaladas. Para rodar:

```
npm run dev
```

A API sobe em `http://localhost:3001`. Endpoint principal: `GET /api/medidas`
(aceita `?servico=` e `?regional=` opcionais). As opções de Regional são carregadas
por `GET /api/medidas/opcoes`, a partir de `TBL_LOCAIS.COD_SP`.

## 2. Rodar o frontend

Em outro terminal:

```
cd client
npm run dev
```

Abre em `http://localhost:5173`. O Vite já está configurado para fazer proxy de
`/api/*` para `http://localhost:3001`, então não precisa mudar nada para desenvolvimento local.

## 3. Rodar em produção (uma porta só)

Em vez de dois processos (API + Vite dev server), o Express passa a servir o
build estático do frontend na mesma porta da API (ex: `3001`) — não precisa mais
de proxy nem de duas portas abertas.

Da raiz do projeto:

```
npm run build   # instala deps do client e gera client/dist
npm start       # sobe o Express, servindo /api/* e o front estático na mesma porta
```

Ou os dois passos de uma vez:

```
npm run prod
```

Depois de rodar `npm run build`, qualquer alteração no frontend exige rodar o
build de novo (`npm run build`) e reiniciar o `npm start` — diferente do modo dev
(seção 2), que recarrega automaticamente. Se `client/dist` não existir ainda,
o servidor sobe normalmente mas as rotas de frontend vão dar erro até rodar o build.

## 4. Driver SQL Server

O ambiente ainda não teve o driver ODBC confirmado. Como o backend usa o pacote
`mssql` (protocolo TDS nativo em JS), **não depende de driver ODBC instalado na
máquina** — diferente do exemplo `pyodbc` do documento de contexto. Só é necessário
que a porta do SQL Server esteja acessível a partir de onde o backend rodar.
Se, no futuro, precisar trocar para autenticação Windows/AD, ajuste `server/src/db.js`
(`authentication: { type: 'ntlm', ... }` ou `msnodesqlv8` caso opte por usar o driver
ODBC local).

## 5. Filtros do painel

Nas abas **Medidas Pendentes** e **Histórico**, os gráficos e cards respondem a
estes filtros, enviados à API só quando a seleção é parcial (tudo marcado = sem
parâmetro). Clique isola uma opção; Ctrl/Cmd+clique combina.

| Filtro | Parâmetro | Origem (SQL Server) | Opções |
|---|---|---|---|
| Serviço | `servico` | `TBL_NOTAS.COD_SERVICO` | `COD_SERVICO_FILTRO` / `HIST_SERVICOS_DISPONIVEIS` |
| Regional | `regional` | `TBL_LOCAIS.COD_SP` | regionais do banco |
| Tipo de solicitação | `tipoSolicitacao` | `TBL_DADOS_SOLIC.COD_FIN_ANALISE` | LN, AC, SA, OIP, LP, GD, TR, ML, RL, NT, SEM TIPO |
| Classe | `classe` | `TBL_DADOS_SOLIC.DES_CLASSE` | RESIDENCIAL, COMERCIAL, INDUSTRIAL, OUTRAS |
| Número de caixas | `faixaCaixas` | `TBL_DADOS_SOLIC.NUM_CAIXAS` | 1, 2, 3, 4 OU MAIS, SEM INFORMAÇÃO |
| Universalização | `universalizacao` | `TBL_NOTAS.COD_UNIVERSALIZACAO` | Universalizada, Não universalizada, Fora da universalização, Obras de segurança, Outros |

Regras comuns a todas as rotas que aceitam os filtros: parâmetro **ausente** = sem
filtro; lista **vazia** (`?universalizacao=`) = resposta vazia, sem consultar o
banco; no Histórico, valor fora da lista = erro 400.

### Universalização

As cinco categorias (`UNIVERSALIZADA`, `NAO_UNIVERSALIZADA`, `FORA_UNIVERSALIZACAO`,
`SEGURANCA`, `OUTROS`) saem de **uma única expressão SQL**,
`universalizacaoCase()` em `server/src/queries/tipoSolicitacao.js`, usada pelo
gráfico "Universalização de obras" e pelo filtro — por isso os dois nunca
divergem. Os códigos de cada categoria vêm de `regrasHistorico.universalizacao`
(`HIST_UNIVERSALIZADA_CODIGOS`, `HIST_NAO_UNIVERSALIZADA_CODIGOS`,
`HIST_FORA_UNIVERSALIZACAO_CODIGOS`, `HIST_SEGURANCA_CODIGOS`); qualquer outro
código, nulo ou vazio cai em `OUTROS`. Como é atributo da nota, o filtro vale
para todos os gráficos e cards da aba; no Histórico ele também filtra o próprio
gráfico de universalização.

**Conferência no banco (DBeaver).** Os totais por categoria e a linha `TOTAL` (a
soma das cinco) devem bater com o total de notas. Se alterou os códigos no
`.env`, troque as listas abaixo pelas suas:

```sql
WITH X AS (
  SELECT CASE
           WHEN N.COD_UNIVERSALIZACAO IN ('50','51','55','56') THEN 'UNIVERSALIZADA'
           WHEN N.COD_UNIVERSALIZACAO IN ('70') THEN 'NAO_UNIVERSALIZADA'
           WHEN N.COD_UNIVERSALIZACAO IN ('10') THEN 'FORA_UNIVERSALIZACAO'
           WHEN N.COD_UNIVERSALIZACAO IN ('11','12','13') THEN 'SEGURANCA'
           ELSE 'OUTROS'
         END AS CATEGORIA
  FROM TBL_NOTAS N
)
SELECT COALESCE(CATEGORIA, 'TOTAL') AS CATEGORIA, COUNT(*) AS NOTAS
FROM X
GROUP BY ROLLUP(CATEGORIA)
ORDER BY GROUPING(CATEGORIA), CATEGORIA;
```

No painel, o mesmo teste: com tudo marcado anote o número de um card; isole cada
uma das cinco categorias e some — o total deve ser o mesmo.

## 6. Testes

```
cd server
npm test
```

Usa o `node --test` (sem dependências extras) e não precisa de banco: verificam
o CASE de universalização e as regras das rotas com um banco falso, e a
partição das cinco categorias (cada nota em exatamente uma, soma = total) num
SQLite em memória (`node:sqlite`; se a versão do Node não tiver, esse teste é
ignorado). Eles **não** substituem a conferência no banco acima.

## 7. Estrutura

```
server/
  src/
    config.js              # lê .env, expõe regras de negócio configuráveis
    db.js                  # pool de conexão mssql
    queries/medidasPendentes.js  # query parametrizada (grupo1/grupo2/status/serviço)
    routes/medidas.js      # GET /api/medidas
    index.js               # bootstrap do Express
client/
  src/
    components/            # Header, MetricCards, Filters, MedidasTable, StatusBadge
    styles/                # identidade visual Cemig (cores, tipografia)
    App.jsx
```
