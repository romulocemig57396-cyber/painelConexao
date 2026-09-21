# Painel externo (Portal Conexão MT)

O painel externo deixou de ser um site estático no GitHub Pages — agora é uma
página dentro do **Portal Conexão MT** (`portal-conexao-mt`, Next.js, hospedado
no Railway), com login próprio e um papel de usuário dedicado (`externo`) que só
vê esse painel, nada do resto do Portal.

Esse projeto (`painelConexao`) só manda os dados via HTTP; não guarda mais
nada em `docs/`, não faz `git push` em lugar nenhum, e o botão **Atualizar
painel externo** não depende mais de `git` estar instalado ou configurado no
ambiente do processo — só de `node` e de rede até o Portal.

## Como funciona

1. `server/scripts/exportarPainelExterno.js` consulta o banco (Histórico,
   Medidas agregadas, Inconsistências e Orçamentos Emitíveis) e faz
   `POST https://portal-conexao-mt-production.up.railway.app/api/painel-externo/atualizar`,
   com o header `x-api-key` (mesma chave de `PORTAL_RESUMO_API_KEY`).
2. O Portal substitui os 4 conjuntos de dados por completo (não acumula
   histórico de versões) e serve tudo pra quem tiver login com papel
   `externo`, `gestor` ou `colaborador`.

Isso pode ser disparado de duas formas, com o mesmo efeito:

- O botão **Atualizar painel externo**, no cabeçalho do painel principal.
- Rodando `atualizar_historico.bat` (ou `atualizar_historico_publico.bat`,
  que só chama o outro) na raiz do projeto.

## Configuração necessária (`server/.env`)

```env
PORTAL_PAINEL_EXTERNO_URL=https://portal-conexao-mt-production.up.railway.app/api/painel-externo/atualizar
PORTAL_RESUMO_API_KEY=<mesma chave já usada pelo resumo diário>
```

## Rede corporativa com inspeção de TLS

Se o botão falhar com `fetch failed — causa: UNABLE_TO_GET_ISSUER_CERT_LOCALLY`
(ou `SELF_SIGNED_CERT_IN_CHAIN`/`DEPTH_ZERO_SELF_SIGNED_CERT`), é o proxy/
firewall da rede trocando o certificado HTTPS do Railway pelo de uma CA
interna, que o Node não confia por padrão (mesmo o Windows já confiando nela
via política de grupo). Resolve exportando o certificado raiz dessa CA
(`certmgr.msc` → Autoridades de Certificação Raiz Confiáveis → Certificados →
exportar como Base-64 X.509 `.CER`) e apontando `NODE_EXTRA_CA_CERTS` pra
esse arquivo — já tem uma linha comentada pronta pra descomentar em
`iniciar-painel.bat` e `atualizar_historico.bat`.

## Conteúdo exportado

- **Histórico**: aprovação, liberação e universalização, quebrados por mês,
  serviço, mercado e Regional — uma consulta por gráfico já traz todas as
  combinações, sem precisar de um recorte por vez.
- **Medidas agregadas**: grupos 1 e 2, por serviço/mercado/Regional/medida/
  situação — mesma query que já existia (`medidasPublicoResumo.js`).
- **Inconsistências** e **Orçamentos Emitíveis**: linha a linha (nota,
  serviço, status, situação, área), **sem `DES_ENDERECO_OBRA`** — o endereço
  da obra nunca sai daqui. `DES_OBRA` e a localidade (Regional/`LOCALIDADE`)
  continuam, por decisão explícita de que o acesso já fica controlado pelo
  login do Portal, não por agregação.

Produtividade por matrícula **não é exportada** — segue só no painel interno,
já que envolve identificar pessoas.

## Privacidade

Histórico e Medidas agregadas continuam sendo só contagens (`COUNT(*) ...
GROUP BY`), sem nenhuma coluna de nota/matrícula/nome — mesma garantia de
antes. A mudança real de postura é em Inconsistências e Orçamentos Emitíveis,
que agora vão quase linha a linha (com exceção do endereço) — a proteção
contra acesso indevido deixou de ser "o dado não existe no arquivo" e passou a
ser "só entra com login", através do papel `externo` do Portal, que não vê
nenhuma outra função dele.
