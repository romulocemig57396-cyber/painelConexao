require('../src/confiarCertificadosWindows');
const { getPool } = require('../src/db');
const { buscarHistoricoAprovacaoGranular, buscarValorObraAprovacaoGranular } = require('../src/queries/historicoAprovacao');
const { buscarHistoricoLiberacaoGranular, buscarValorObraLiberacaoGranular } = require('../src/queries/historicoLiberacao');
const { buscarHistoricoUniversalizacaoGranular, buscarValorObraUniversalizacaoGranular } = require('../src/queries/historicoUniversalizacao');
const { buscarResumoMedidasPublico, buscarValorObraPublico } = require('../src/queries/medidasPublicoResumo');
const { buscarInconsistencias } = require('../src/queries/inconsistencias');
const { buscarOrcamentosEmitiveis } = require('../src/queries/orcamentosEmitiveis');
const { buscarResumoMedida0070RegionalGranular } = require('../src/queries/medida0070RegionalResumo');

// Substitui o antigo exportarHistoricoEstatico.js (site estático no GitHub
// Pages): em vez de escrever docs/data/historico.json, este script consulta
// tudo já quebrado por serviço/mercado/regional numa passada só (sem o laço
// combinatório de 288 combinações) e manda pro Portal Conexão MT via HTTP.
//
// Inconsistências e Orçamentos Emitíveis vão linha a linha, exceto
// DES_ENDERECO_OBRA (endereço da obra nunca sai daqui) — confirmado por
// pedido explícito do usuário; DES_OBRA e LOCALIDADE continuam.
async function main() {
  const url = process.env.PORTAL_PAINEL_EXTERNO_URL;
  const apiKey = process.env.PORTAL_RESUMO_API_KEY;
  if (!url || !apiKey) {
    throw new Error('PORTAL_PAINEL_EXTERNO_URL/PORTAL_RESUMO_API_KEY não configurados em server/.env');
  }

  const pool = await getPool();
  try {
    console.log('Consultando histórico (aprovação/liberação/universalização)...');
    const [aprovacao, liberacao, universalizacao] = await Promise.all([
      buscarHistoricoAprovacaoGranular(pool),
      buscarHistoricoLiberacaoGranular(pool),
      buscarHistoricoUniversalizacaoGranular(pool),
    ]);
    const [valorObraAprovacao, valorObraLiberacao, valorObraUniversalizacao] = await Promise.all([
      buscarValorObraAprovacaoGranular(pool),
      buscarValorObraLiberacaoGranular(pool),
      buscarValorObraUniversalizacaoGranular(pool),
    ]);

    console.log('Consultando medidas agregadas, medida 0070 por regional, inconsistências e orçamentos emitíveis...');
    const [medidas, valorObra, medida0070Regional, inconsistencias, orcamentosEmitiveis] = await Promise.all([
      buscarResumoMedidasPublico(pool),
      buscarValorObraPublico(pool),
      buscarResumoMedida0070RegionalGranular(pool),
      buscarInconsistencias(pool),
      buscarOrcamentosEmitiveis(pool),
    ]);

    const historico = [
      ...aprovacao.map((r) => ({
        grafico: 'aprovacao',
        mes: r.MES,
        servico: r.SERVICO,
        mercado: r.MERCADO,
        regional: r.REGIONAL,
        tipoSolicitacao: r.TIPO_SOLICITACAO,
        classe: r.CLASSE,
        faixaCaixas: r.FAIXA_CAIXAS,
        universalizacao: r.UNIVERSALIZACAO,
        categoria: r.CATEGORIA,
        quantidade: r.QTD,
      })),
      ...liberacao.map((r) => ({
        grafico: 'liberacao',
        mes: r.MES,
        servico: r.SERVICO,
        mercado: r.MERCADO,
        regional: r.REGIONAL,
        tipoSolicitacao: r.TIPO_SOLICITACAO,
        classe: r.CLASSE,
        faixaCaixas: r.FAIXA_CAIXAS,
        universalizacao: r.UNIVERSALIZACAO,
        categoria: r.TIPO,
        quantidade: r.QTD,
      })),
      ...universalizacao.map((r) => ({
        grafico: 'universalizacao',
        mes: r.MES,
        servico: r.SERVICO,
        mercado: r.MERCADO,
        regional: r.REGIONAL,
        tipoSolicitacao: r.TIPO_SOLICITACAO,
        classe: r.CLASSE,
        faixaCaixas: r.FAIXA_CAIXAS,
        universalizacao: r.UNIVERSALIZACAO,
        categoria: r.CATEGORIA,
        quantidade: r.QTD,
      })),
    ];

    const medidasPayload = medidas.map((r) => ({
      grupo: r.GRUPO,
      servico: r.SERVICO,
      mercado: r.MERCADO,
      regional: r.REGIONAL,
      tipoSolicitacao: r.TIPO_SOLICITACAO,
      classe: r.CLASSE,
      faixaCaixas: r.FAIXA_CAIXAS,
      universalizacao: r.UNIVERSALIZACAO,
      codMedida: r.COD_MEDIDA,
      situacao: r.DES_SITUACAO,
      quantidade: r.QUANTIDADE,
    }));

    // Mesmo formato pros 4 gráficos: "medidas" (Medidas Pendentes) + 3 do histórico.
    const linhaValorObra = (grafico) => (r) => ({
      grafico,
      servico: r.SERVICO,
      mercado: r.MERCADO,
      regional: r.REGIONAL,
      tipoSolicitacao: r.TIPO_SOLICITACAO,
      classe: r.CLASSE,
      faixaCaixas: r.FAIXA_CAIXAS,
      universalizacao: r.UNIVERSALIZACAO,
      notas: r.NOTAS,
      valorObra: r.VALOR_OBRA ?? 0,
    });
    const valorObraPayload = [
      ...valorObra.map(linhaValorObra('medidas')),
      ...valorObraAprovacao.map(linhaValorObra('aprovacao')),
      ...valorObraLiberacao.map(linhaValorObra('liberacao')),
      ...valorObraUniversalizacao.map(linhaValorObra('universalizacao')),
    ];

    const medida0070RegionalPayload = medida0070Regional.map((r) => ({
      servico: r.SERVICO,
      regional: r.REGIONAL,
      tipoSolicitacao: r.TIPO_SOLICITACAO,
      classe: r.CLASSE,
      faixaCaixas: r.FAIXA_CAIXAS,
      universalizacao: r.UNIVERSALIZACAO,
      situacao: r.DES_SITUACAO,
      quantidade: r.QUANTIDADE,
    }));

    const inconsistenciasPayload = inconsistencias.map((r) => ({
      tipo: r.TIPO_INCONSISTENCIA,
      numNota: r.NUM_NOTA,
      codServico: r.COD_SERVICO,
      datCriacao: r.DAT_CRIACAO,
      codStatusUsuNota: r.COD_STATUS_USU_NOTA,
      codMedida: r.COD_MEDIDA,
      codStatUsu: r.COD_STAT_USU,
    }));

    const orcamentosPayload = orcamentosEmitiveis.map((r) => ({
      numNota: r.NUM_NOTA,
      codServico: r.COD_SERVICO,
      desServico: r.DES_SERVICO,
      desObra: r.DES_OBRA,
      // DES_ENDERECO_OBRA fica de fora de propósito.
      regional: r.REGIONAL,
      localidade: r.LOCALIDADE,
      dataCriacaoNota: r.DATA_CRIACAO_NOTA,
      codMedida: r.COD_MEDIDA,
      codStatUsu: r.COD_STAT_USU,
      dataCriacaoMedida: r.DATA_CRIACAO_MEDIDA,
      dataVencimento: r.DATA_VENCIMENTO,
      itemAnexo: r.ITEM_ANEXO,
      prazoPadrao: r.PRAZO_PADRAO,
      prazoReal: r.PRAZO_REAL,
      gerExpResp: r.GER_EXP_RESP,
      tipoPrazo: r.TIPO_PRAZO,
      dataConclusaoReal: r.DATA_CONCLUSAO_REAL,
      codAreaResp: r.COD_AREA_RESP,
      desSituacao: r.DES_SITUACAO,
    }));

    console.log(
      `Enviando ${historico.length} linhas de histórico, ${medidasPayload.length} de medidas, ` +
        `${valorObraPayload.length} de valor da obra, ${medida0070RegionalPayload.length} de medida 0070 por regional, ${inconsistenciasPayload.length} ` +
        `inconsistências e ${orcamentosPayload.length} orçamentos emitíveis...`,
    );

    const corpoRequisicao = JSON.stringify({
      historico,
      medidas: medidasPayload,
      valorObra: valorObraPayload,
      medida0070Regional: medida0070RegionalPayload,
      inconsistencias: inconsistenciasPayload,
      orcamentosEmitiveis: orcamentosPayload,
    });
    console.log(`Tamanho do corpo da requisição: ${(corpoRequisicao.length / 1024 / 1024).toFixed(2)} MB`);

    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: corpoRequisicao,
      });
    } catch (err) {
      // fetch() só lança um TypeError raso ("fetch failed"); a causa real
      // (DNS, timeout, conexão recusada/resetada) vem em err.cause.
      const causa = err.cause ? ` — causa: ${err.cause.code || err.cause.message || err.cause}` : '';
      throw new Error(`${err.message}${causa}`, { cause: err });
    }

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      throw new Error(`Portal respondeu ${resp.status}: ${corpo.slice(0, 300)}`);
    }

    console.log('OK: painel externo atualizado no Portal Conexão MT.');
  } finally {
    await pool.close();
  }
}

// process.exitCode (não process.exit()) de propósito — ver comentário em
// resumo-diario.js: sair à força logo após pool.close() derruba handles
// nativos do mssql ainda fechando e crasha o processo.
main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('ERRO ao exportar painel externo:', err.message);
    process.exitCode = 1;
  });
