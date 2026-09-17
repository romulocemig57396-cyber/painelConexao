# Contexto do projeto: Painel de medidas pendentes

## Objetivo
Web app para a equipe acompanhar medidas pendentes vinculadas a notas SAP, extraídas de um banco SQL Server alimentado via ETL do SAP.

---

## 1. Banco de dados

- **Tipo**: SQL Server
- **Banco**: `DB_SGO`
- **Schema**: `dbo`

### Conexão (padrão validado, sem Streamlit)

Usar `pyodbc` (ou driver equivalente na stack escolhida). Exemplo de string de conexão já testado nesse ambiente:

```python
import pyodbc

conn_str = (
    f"DRIVER={{SQL Server Native Client 11.0}};"  # ou driver ODBC disponível no ambiente
    f"SERVER={server};"      # ex: host,porta
    f"DATABASE={database};" # DB_SGO
    f"UID={username};"
    f"PWD={password};"
    f"Encrypt=no;"           # ajustar conforme política de rede
    f"TrustServerCertificate=yes;"
    "Connection Timeout=30;"
)
conn = pyodbc.connect(conn_str)
```

Credenciais/servidor devem vir de variáveis de ambiente (`.env`), nunca hardcoded:
`DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PWD`, `ODBC_DRIVER`, `DB_ENCRYPT`, `DB_TRUST_CERT`.

> Observação: verificar qual driver ODBC está instalado na máquina que vai rodar o backend (`SQL Server Native Client 11.0` ou `ODBC Driver 17/18 for SQL Server`) — pode variar por ambiente.

---

## 2. Tabelas e campos usados

### `TBL_MEDIDAS`
Medidas (tarefas/measures) vinculadas a uma nota.

| Campo | Tipo | Significado |
|---|---|---|
| `NUM_NOTA` | nvarchar | Nota vinculada (chave de ligação com `TBL_NOTAS`) |
| `COD_MEDIDA` | nvarchar | Número da medida (ex: `'0019'`, `'0020'` — **com zero à esquerda, é texto**) |
| `COD_STAT_USU` | nvarchar | Status: `ABER`, `ANDM`, `CONC`, `ENCE`, `CANC` |
| `DAT_SOLIC` | datetime | Data de criação da medida |
| `DAT_TPREV` | datetime | Data histórica da medida; não é mais usada como vencimento regulatório |
| `DAT_TREAL` | datetime | Data de conclusão real |
| `COD_AREA_RESP` | nvarchar | Área/equipe responsável (ex: `PE-NTC`, `CN-EXP`) |
| `COD_RESP_CRIACAO` / `COD_RESP_CONC` | nvarchar | Responsável pela criação / conclusão |
| `DES_SITUACAO` / `DES_SITUACAO2` | nvarchar | Situação operacional legada; os painéis regulatórios usam a situação derivada da tabela ANEEL |

### `TBL_ANEEL_INDGER_V20_DIARIO`
Fonte oficial consolidada do vencimento regulatório da REN 1000.

| Campo | Uso no painel |
|---|---|
| `NUM_NOTA` | Relacionamento com `TBL_MEDIDAS.NUM_NOTA` |
| `ITEM_ANEXO` | Item regulatório |
| `PRAZO_PADRAO` | Prazo regulamentar do item |
| `PRAZO_REAL` | Consumo real do prazo |
| `DAT_VENCIMENTO` | Vencimento regulatório |
| `REGIONAL` | Regional regulatória |

Uma nota pode ter mais de um registro regulatório. O sistema seleciona um único
registro por nota, priorizando `DAT_VENCIMENTO` não nulo mais recente, depois
`PRAZO_REAL` maior e, por fim, `ITEM_ANEXO` em ordem decrescente. Esse critério
evita duplicação na tela e representa o item vigente mais conservador disponível
na tabela diária.

Campos irrelevantes para este projeto: `DAT_IPREV`.

### `TBL_NOTAS`
Dados da nota (uma nota pode ter várias medidas).

| Campo | Tipo | Significado |
|---|---|---|
| `NUM_NOTA` | nvarchar | Chave |
| `COD_SERVICO` | nvarchar | **Tipo de solicitação da nota** (`COMT`, `COBT`, `PSAA`, `PSAI`, etc.) — campo confirmado por inspeção de dados, não confundir com "código de serviço técnico" |
| `DES_SERVICO` | nvarchar | Descrição do serviço |
| `DES_OBRA` / `DES_ENDERECO_OBRA` | nvarchar | Descrição/endereço da obra |
| `NUM_ORDEM_PRINC` | nvarchar | Ordem vinculada |
| `TIP_ATEND` | nvarchar | Tipo de atendimento (não confirmado, campo não usado no tipo COMT/COBT) |
| `COD_TIPO` | nvarchar | **Não é o tipo de solicitação** — contém outra classificação (`EI`, `EO`, `EM`), descartado para este propósito |

### `TBL_DADOS_SOLIC`
Detalhe de instalação/cliente (endereço, dados técnicos). Não é necessária para o filtro de pendências, mas pode enriquecer telas futuras (endereço, PN, cidade). Chave: `NUM_NOTA` / `NUM_SOLICITACAO`.

---

## 3. Regra de negócio e query final validada

**Filtro principal**: medidas do "grupo 1" pendentes, em notas dos tipos de serviço
configurados em `COD_SERVICO_FILTRO` (por padrão, os mesmos tipos disponíveis no Histórico).
**Sinalização adicional**: se a mesma nota também tem alguma medida do "grupo 2" pendente, mostrar quais.

```sql
SELECT 
    N.NUM_NOTA,
    N.COD_SERVICO,
    N.DES_SERVICO,
    N.DES_OBRA,
    N.DES_ENDERECO_OBRA,
    M.COD_MEDIDA,
    M.COD_STAT_USU,
    M.DAT_SOLIC      AS DATA_CRIACAO_MEDIDA,
    R.DAT_VENCIMENTO AS DATA_VENCIMENTO,
    R.ITEM_ANEXO,
    R.PRAZO_PADRAO,
    R.PRAZO_REAL,
    M.DAT_TREAL      AS DATA_CONCLUSAO_REAL,
    M.COD_AREA_RESP,
    -- A situação é derivada de R.DAT_VENCIMENTO; 0019 permanece como PENDENTES.
    CASE WHEN P.MEDIDAS_PENDENTES IS NOT NULL THEN 'SIM' ELSE 'NAO' END AS TEM_PENDENCIA_GRUPO2,
    P.MEDIDAS_PENDENTES AS MEDIDAS_PENDENTES_GRUPO2
FROM TBL_MEDIDAS M
INNER JOIN TBL_NOTAS N 
    ON M.NUM_NOTA = N.NUM_NOTA
LEFT JOIN (
    SELECT 
        M2.NUM_NOTA,
        STRING_AGG(M2.COD_MEDIDA, ', ') AS MEDIDAS_PENDENTES
    FROM TBL_MEDIDAS M2
    WHERE M2.COD_MEDIDA IN ('0070','0805','0804','0700','0720')
      AND M2.COD_STAT_USU IN ('ABER','ANDM')
    GROUP BY M2.NUM_NOTA
) P ON P.NUM_NOTA = M.NUM_NOTA
OUTER APPLY (
    SELECT TOP (1) A.*
    FROM TBL_ANEEL_INDGER_V20_DIARIO A
    WHERE A.NUM_NOTA = M.NUM_NOTA
    ORDER BY
        CASE WHEN A.DAT_VENCIMENTO IS NULL THEN 1 ELSE 0 END,
        A.DAT_VENCIMENTO DESC,
        A.PRAZO_REAL DESC,
        A.ITEM_ANEXO DESC
) R
WHERE 
    M.COD_MEDIDA IN ('0019','0020','0021','0032','0080','0086')
    AND M.COD_STAT_USU IN ('ABER','ANDM')
    AND N.COD_SERVICO IN (
        'COMT','COBT','PSAA','PSER','PSAC','PSRP',
        'PSAG','PSAI','PSAF','PSSG','PSIP','PSST'
    )
ORDER BY 
    N.NUM_NOTA, R.DAT_VENCIMENTO ASC;
```

Durante a validação, `REGULATORIO_DEBUG=true` registra até 20 linhas por
consulta com `NUM_NOTA`, `ITEM_ANEXO`, `PRAZO_PADRAO`, `DAT_VENCIMENTO` e
`REGIONAL`. A comparação da base pendente encontrou 7.338 medidas, sendo
3.461 com data diferente da antiga `TBL_MEDIDAS.DAT_TPREV` e 1.534 sem
registro regulatório correspondente.

**Notas importantes:**
- `STRING_AGG` requer SQL Server 2017+. Se der erro, trocar por `FOR XML PATH`.
- Uma mesma `NUM_NOTA` pode aparecer em múltiplas linhas (uma por medida do grupo 1) — comportamento esperado.
- Grupo 1 (filtro principal): `0019, 0020, 0021, 0032, 0080, 0086`
- Grupo 2 (sinalização): `0070, 0805, 0804, 0700, 0720`
- O vencimento e a situação do grupo 1 são obtidos da
  `TBL_ANEEL_INDGER_V20_DIARIO`, usando `DAT_VENCIMENTO` como fonte oficial.
- O grupo 2 não usa a tabela ANEEL: mantém `TBL_MEDIDAS.DAT_TPREV`,
  `TBL_MEDIDAS.DES_SITUACAO` e `TBL_MEDIDAS.DES_SITUACAO2`.
- Quando há mais de um registro ANEEL para uma nota do grupo 1, a seleção é
  feita por `DAT_VENCIMENTO` não nulo, maior vencimento, maior `PRAZO_REAL` e,
  por fim, maior `ITEM_ANEXO`, evitando duplicidade na tela.
- Ambos os grupos e a lista de `COD_SERVICO` devem ser **configuráveis**, não fixos no código — a equipe pode querer ajustar isso no futuro.

---

## 4. Link para o SAP (S4)

Cada nota pode linkar direto para a transação SAP (IW52) usando o padrão:

```
https://prd.sap.cemig.com.br/sap/bc/gui/sap/its/webgui?sap-client=100&~transaction=*IW52%20RIWO00-QMNUM={NUM_NOTA}
```

Sugestão: adicionar como coluna/botão "Abrir no SAP" na tabela.

---

## 5. Direção visual (validada com o usuário)

Identidade inspirada no padrão visual Cemig:

- **Cabeçalho**: verde escuro `#1E5A4B`, texto branco
- **Verde de destaque/gradiente**: `#8BC53F` → `#3D9B3D`
- **Verde-petróleo (badges, círculos numerados)**: `#1E7A5F`
- **Cinza claro (cards informativos)**: fundo `#F2F2F2`, borda `#E0E0E0`
- **Texto de corpo**: tom verde-escuro/azulado em vez de preto puro em alguns textos de apoio
- **Tipografia**: sans-serif limpo e arredondado, estilo Roboto/Open Sans
- **Componentes**: cantos arredondados, sombra bem sutil, badges em pill (`border-radius` alto)

**Cores semânticas de prazo (mantidas por clareza, independente da marca):**
- Em atraso: fundo `#FBE4E4`, texto `#9E2B2B`
- Vence hoje / vence em breve: fundo `#FDEFD8`, texto `#8A5A0B`
- No prazo: fundo `#E3F1E6`, texto `#1E7A5F`
- Pendência grupo 2 (alerta): fundo `#FBE4E4`, texto `#9E2B2B`

**Tela validada inclui:**
- Cards de métricas no topo (total pendentes, em atraso, com pendência grupo 2, áreas envolvidas)
- Filtros por área responsável e status
- Tabela com badges coloridos de status/prazo
- Aviso destacado para linhas com pendência do grupo 2

---

## 6. Stack

- **Não usar Streamlit** (preferência explícita do usuário) nem Python no frontend.
- Backend + frontend a definir no Claude Code — conexão com o banco deve seguir o padrão pyodbc acima, adaptado à linguagem/stack escolhida.
