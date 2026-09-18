# Publicar o histórico estático no GitHub Pages

O site fica em `docs/` e é um **repositório Git separado** do projeto principal
(server/client não entram nisso). Só o conteúdo de `docs/` (HTML/CSS/JS +
`data/historico.json`, que tem apenas contagens agregadas) vai para um
repositório público dedicado.

## Configuração inicial (rodar uma única vez)

### 1. Gerar os dados pela primeira vez

No terminal, na raiz do projeto (onde já roda o `server`, com o `server/.env`
configurado):

```
node server\scripts\exportarHistoricoEstatico.js
```

Isso cria `docs\data\historico.json`. Confira se o arquivo foi gerado antes de
seguir.

### 2. Criar o repositório dedicado no GitHub

1. Acesse https://github.com/new
2. Escolha um nome (ex: `historico-medidas-publico`)
3. Marque **Public** — é obrigatório para usar GitHub Pages grátis
4. **Não** marque "Add a README" nem `.gitignore`/license — deixe o
   repositório vazio (o conteúdo já existe localmente em `docs/`)
5. Crie o repositório e copie a URL dele (ex:
   `https://github.com/SEU-USUARIO/historico-medidas-publico.git`)

### 3. Transformar `docs/` no repositório local desse projeto

No terminal (troque o caminho pelo da sua cópia do projeto):

```
cd "<caminho-da-sua-copia-do-projeto>\docs"
git init
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/historico-medidas-publico.git
git add -A
git commit -m "Primeira publicacao do historico estatico"
git push -u origin main
```

(Só nesse primeiro push o Git pode pedir login/autenticação do GitHub —
use um Personal Access Token se pedir senha, o GitHub não aceita mais senha
de conta normal por HTTPS.)

### 4. Ativar o GitHub Pages

1. No repositório novo, vá em **Settings → Pages**
2. Em **Source**, escolha **Deploy from a branch**
3. Em **Branch**, escolha **main** e a pasta **/ (root)** — não "/docs": como
   esse repositório contém *só* o site (o `docs/` daqui virou a raiz de lá),
   a pasta é a raiz, não uma subpasta.
4. Salve. Em 1-2 minutos o site fica disponível em algo como:
   `https://SEU-USUARIO.github.io/historico-medidas-publico/`

## Atualização do dia a dia

Depois da configuração inicial acima, basta dar duplo clique em:

```
atualizar_historico_publico.bat
```

(na raiz do projeto). Ele roda o script de exportação, e se algo mudou desde
a última publicação, faz commit e push automaticamente para o repositório do
passo 2-3. Se não houver mudança nos dados, ele avisa e não publica nada.

No painel principal, o botão **Atualizar painel externo**, no canto superior
direito do cabeçalho, oferece o mesmo fluxo sem abrir um arquivo `.bat`. O
servidor executa a exportação em segundo plano, atualiza somente
`docs/data/historico.json`, faz `pull --ff-only`, commit e push. O botão mostra
o andamento e impede duas atualizações simultâneas.

Esse recurso depende de o processo do painel ter acesso ao `node`, ao `git` e
às credenciais do repositório `docs/`. Se o painel for iniciado por um serviço
ou pelo Agendador de Tarefas, configure esses executáveis e a autenticação no
ambiente desse processo, não apenas no terminal interativo do usuário.

Quando o projeto principal usa `docs/` como submódulo ou quando o clone do
painel público fica em outra pasta, configure também no `server/.env`:

```env
PUBLIC_REPO_DIR=C:\caminho\para\o\clone\do\painel-publico
```

O botão valida esse diretório antes de consultar o banco e informa o caminho
esperado se o repositório não estiver disponível.

## Conteúdo exportado

O JSON contém o Histórico agregado por mês, serviço, mercado e Regional, além
das medidas pendentes dos grupos 1 e 2 agregadas por serviço, Regional, medida
e situação de vencimento. Ele também inclui as listas usadas pelos filtros e
os dados dos quatro cards operacionais: Análise Inicial, Análise de Conexão,
Orçamento e Orçamento Estimado.

O site calcula as seleções combinadas no navegador. Os filtros padrão seguem o
painel interno: PSAA e PSAI começam desmarcados, enquanto todas as Regionais e
medidas do grupo 1 começam selecionadas.

## Antes de compartilhar o link — confirmação de privacidade

Conferi o SQL das queries usadas pelo script de exportação
(`server/src/queries/historicoAprovacao.js`, `historicoLiberacao.js`,
`historicoUniversalizacao.js` e `medidasPublicoResumo.js`): todas fazem
`SELECT` de categorias/códigos e `COUNT(*) ... GROUP BY`. Ou seja, o
`historico.json` gerado contém **apenas contagens agregadas por
mês/categoria/serviço/mercado/Regional/medida** — nenhuma
coluna de nota, matrícula, nome ou qualquer identificador individual é
selecionada em nenhum ponto dessas queries, então não há como esse dado
vazar para o JSON. As credenciais do banco (`server/.env`) nunca entram
em `docs/` — o script só as usa em memória, no seu computador, para consultar
o banco.
