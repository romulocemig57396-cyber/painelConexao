const path = require('path');

// Caminho explícito (relativo a este arquivo, não a process.cwd()) — sem
// isso, dotenv só acha o .env quando o processo é iniciado de dentro de
// server/. O Agendador de Tarefas do Windows não garante esse "start in"
// (usado por server/scripts/resumo-diario.js), então precisa ser explícito.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function parseList(value, fallback) {
  if (!value) return fallback;
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

const config = {
  db: {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || 'DB_SGO',
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
  port: Number(process.env.PORT) || 3001,
  regrasNegocio: {
    grupo1Medidas: parseList(process.env.GRUPO1_MEDIDAS, ['0019', '0020', '0021', '0032', '0080', '0086']),
    grupo2Medidas: parseList(process.env.GRUPO2_MEDIDAS, ['0070', '0805', '0804', '0700', '0720']),
    statusPendente: parseList(process.env.STATUS_PENDENTE, ['ABER', 'ANDM']),
    codServicoFiltro: parseList(process.env.COD_SERVICO_FILTRO, ['COMT']),
  },
  regrasHistorico: {
    codServicoFiltro: parseList(process.env.HIST_COD_SERVICO_FILTRO, ['COMT']),
    // Serviços/mercados selecionáveis pelo usuário na aba Histórico (filtros
    // servico e mercado dos 3 endpoints). servico ausente => usa
    // codServicoFiltro acima (hoje só COMT, preserva o comportamento atual).
    // mercado ausente => sem filtro de DES_MERCADO (COMT + COBT, urbano + rural juntos).
    servicosDisponiveis: parseList(process.env.HIST_SERVICOS_DISPONIVEIS, [
      'COMT', 'COBT', 'PSAA', 'PSER', 'PSAC', 'PSRP', 'PSAG', 'PSAI', 'PSAF', 'PSSG', 'PSIP', 'PSST',
    ]),
    mercadosDisponiveis: parseList(process.env.HIST_MERCADOS_DISPONIVEIS, ['URBANO', 'RURAL']),
    dataMinima: process.env.HIST_DATA_MINIMA || '2025-01-01',
    // Gráfico 1 (aprovação): medida verificada e os 3 status mutuamente exclusivos
    // (checados por palavra inteira dentro de COD_STAT_USU, nunca por igualdade).
    medidaAprovacao: process.env.HIST_MEDIDA_APROVACAO || '0019',
    statusCancelado: process.env.HIST_STATUS_CANCELADO || 'CANC',
    statusAprovado: process.env.HIST_STATUS_APROVADO || 'CTEC',
    statusReprovado: process.env.HIST_STATUS_REPROVADO || 'RTEC',
    // Gráfico 2 (tipo de liberação): uma medida por categoria, excluindo CANC.
    liberacaoMedidas: {
      comObras: process.env.HIST_MEDIDA_COM_OBRAS || '0590',
      semObras: process.env.HIST_MEDIDA_SEM_OBRAS || '0550',
      servicosRede: process.env.HIST_MEDIDA_SERVICOS_REDE || '0501',
    },
    // Gráfico 3 (produtividade por matrícula): medidas contadas como "concluídas"
    // (DAT_TREAL preenchida, independente do status atual) e quantas matrículas
    // aparecem nomeadas por mês antes de agrupar o resto em "Outros".
    // Gráfico 4 (universalização de obras): notas da medida "com obras"
    // (liberacaoMedidas.comObras) não cancelada, categorizadas pelo
    // COD_UNIVERSALIZACAO da nota. Qualquer código fora das duas listas
    // abaixo (e nulo/vazio) cai em OUTROS.
    universalizacao: {
      universalizadaCodigos: parseList(process.env.HIST_UNIVERSALIZADA_CODIGOS, ['50', '51', '55', '56']),
      naoUniversalizadaCodigos: parseList(process.env.HIST_NAO_UNIVERSALIZADA_CODIGOS, ['70']),
      foraUniversalizacaoCodigos: parseList(process.env.HIST_FORA_UNIVERSALIZACAO_CODIGOS, ['10']),
      segurancaCodigos: parseList(process.env.HIST_SEGURANCA_CODIGOS, ['11', '12', '13']),
    },
    produtividade: {
      medidas: parseList(
        process.env.HIST_PRODUTIVIDADE_MEDIDAS,
        ['0019', '0032', '0020', '0021', '0080', '0086', '0800'],
      ),
      topN: Number(process.env.HIST_PRODUTIVIDADE_TOP_N) || 10,
    },
  },
  regrasInconsistencias: {
    codServicoFiltro: parseList(process.env.INC_COD_SERVICO_FILTRO, ['COMT', 'COBT', 'PSER', 'PSRP', 'PSAF']),
    dataCriacaoMinima: process.env.INC_DATA_CRIACAO_MINIMA || '2026-01-01',
    // Palavras (não substring) que, se presentes em COD_STATUS_USU_NOTA, excluem a nota.
    statusNotaExcluir: parseList(process.env.INC_STATUS_NOTA_EXCLUIR, ['CANC', 'EXEC']),
    // Status considerado "em andamento" nas checagens de NOT EXISTS (ABER/ANDM).
    statusPendente: parseList(process.env.INC_STATUS_PENDENTE, ['ABER', 'ANDM']),
    // Tipo 1: "Medidas de resposta com status indevido".
    tipo1Medidas: parseList(process.env.INC_TIPO1_MEDIDAS, ['0550', '0501', '0590', '0595', '0596']),
    // Medidas de resposta da cadeia 0019 → 0020 → 0080 (reaproveitadas nos tipos 2/3/4).
    cadeia0019Resposta: parseList(process.env.INC_CADEIA_0019_RESPOSTA, ['0550', '0501', '0554', '0590']),
    // Medidas de resposta da cadeia 0032 → 0021 → 0086 (reaproveitadas nos tipos 2/3/4).
    cadeia0032Resposta: parseList(process.env.INC_CADEIA_0032_RESPOSTA, ['0595', '0596', '0554']),
    // Palavra que, se presente em COD_STAT_USU da medida de resposta (tipos 5/6),
    // indica que a resposta em si já foi cancelada (não conta como inconsistência).
    statusMedidaCancelada: process.env.INC_STATUS_MEDIDA_CANCELADA || 'CANC',
    // Tipo 5: resposta 0550/0501/0590 já dada, mas 0020/0080 ainda pendente.
    tipo5Resposta: parseList(process.env.INC_TIPO5_RESPOSTA, ['0550', '0501', '0590']),
    tipo5PendenteMedidas: parseList(process.env.INC_TIPO5_PENDENTE_MEDIDAS, ['0020', '0080']),
    // Tipo 6: espelho do tipo 5 pra cadeia 0595/0596 → 0021/0086.
    tipo6Resposta: parseList(process.env.INC_TIPO6_RESPOSTA, ['0595', '0596']),
    tipo6PendenteMedidas: parseList(process.env.INC_TIPO6_PENDENTE_MEDIDAS, ['0021', '0086']),
  },
  sapNotaUrlTemplate:
    process.env.SAP_NOTA_URL_TEMPLATE ||
    'https://prd.sap.cemig.com.br/sap/bc/gui/sap/its/webgui?sap-client=100&~transaction=*IW52%20RIWO00-QMNUM={NUM_NOTA}',
};

module.exports = config;
