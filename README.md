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

## 5. Estrutura

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
