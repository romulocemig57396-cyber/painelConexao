const { sql } = require('../db');
const config = require('../config');
const { inClauseParams, campoNaoContemPalavra, campoContemAlgumaPalavra } = require('./sqlHelpers');

// Checa "palavra inteira" dentro de COD_STATUS_USU_NOTA (campo com múltiplos
// códigos separados por espaço, ex: 'COCI EATL PEND') — padroniza espaços nas
// pontas do valor pra evitar que 'EXEC' bata como substring de outra palavra.
function buildExclusaoStatusNota(request, palavras) {
  return palavras
    .map((palavra, index) => {
      const paramName = `exclNota${index}`;
      request.input(paramName, sql.NVarChar, `% ${palavra} %`);
      return `' ' + N.COD_STATUS_USU_NOTA + ' ' NOT LIKE @${paramName}`;
    })
    .join(' AND ');
}

/**
 * Replica a query de inconsistências validada no DBeaver (7 tipos, 10 blocos
 * UNION ALL) com os valores de listas vindos de config.regrasInconsistencias
 * em vez de hardcoded. A estrutura (quais medidas disparam cada tipo, qual
 * cadeia de "andamento" cada uma checa) permanece fixa — é a identidade de
 * cada regra, não um parâmetro configurável.
 */
async function buscarInconsistencias(pool) {
  const {
    codServicoFiltro,
    dataCriacaoMinima,
    statusNotaExcluir,
    statusPendente,
    tipo1Medidas,
    cadeia0019Resposta,
    cadeia0032Resposta,
    statusMedidaCancelada,
    tipo5Resposta,
    tipo5PendenteMedidas,
    tipo6Resposta,
    tipo6PendenteMedidas,
  } = config.regrasInconsistencias;

  const request = pool.request();

  request.input('dataMin', sql.Date, new Date(dataCriacaoMinima));
  const exclusaoStatusNota = buildExclusaoStatusNota(request, statusNotaExcluir);
  const statusPendenteInClause = inClauseParams(request, 'sp_', statusPendente);
  const tipo1MedidasInClause = inClauseParams(request, 't1_', tipo1Medidas);
  const cadeia0019InClause = inClauseParams(request, 'c19_', cadeia0019Resposta);
  const cadeia0032InClause = inClauseParams(request, 'c32_', cadeia0032Resposta);
  const servicoInClause = inClauseParams(request, 'sv_', codServicoFiltro);

  // Tipos 5/6: resposta dada (medida não cancelada) mas a medida-alvo
  // correspondente ainda pendente (ABER/ANDM) — checagens sempre por palavra
  // inteira, já que COD_STAT_USU é um campo composto (ex: 'CANC PCOR RTEC').
  // Só conta se a resposta foi criada em cima da pendência específica que
  // disparou o EXISTS (M.DAT_SOLIC >= M2.DAT_SOLIC) — resposta anterior à
  // pendência não é inconsistência real.
  const tipo5RespostaInClause = inClauseParams(request, 't5r_', tipo5Resposta);
  const tipo5PendenteInClause = inClauseParams(request, 't5p_', tipo5PendenteMedidas);
  const tipo5MedidaNaoCancelada = campoNaoContemPalavra('M.COD_STAT_USU', request, 't5MedCanc', statusMedidaCancelada);
  const tipo5PendenteStatus = campoContemAlgumaPalavra('M2.COD_STAT_USU', request, 't5pend', statusPendente);

  const tipo6RespostaInClause = inClauseParams(request, 't6r_', tipo6Resposta);
  const tipo6PendenteInClause = inClauseParams(request, 't6p_', tipo6PendenteMedidas);
  const tipo6MedidaNaoCancelada = campoNaoContemPalavra('M.COD_STAT_USU', request, 't6MedCanc', statusMedidaCancelada);
  const tipo6PendenteStatus = campoContemAlgumaPalavra('M2.COD_STAT_USU', request, 't6pend', statusPendente);

  const colunas = `
        N.NUM_NOTA, N.COD_SERVICO, N.DAT_CRIACAO, N.COD_STATUS_USU_NOTA,
        M.COD_MEDIDA, M.COD_STAT_USU`;

  const filtroBase = `
      AND N.DAT_CRIACAO >= @dataMin
      AND ${exclusaoStatusNota}`;

  const query = `
    SELECT * FROM (
    SELECT
        'Medidas de resposta com status indevido' AS TIPO_INCONSISTENCIA,${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA IN (${tipo1MedidasInClause})
      AND M.COD_STAT_USU IN (${statusPendenteInClause})${filtroBase}

    UNION ALL
    SELECT
        '0019/0032 concluída sem andamento',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0019' AND M.COD_STAT_USU = 'CONC'${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_STAT_USU <> 'CANC'
            AND ( (M2.COD_MEDIDA = '0020' AND M2.COD_STAT_USU IN (${statusPendenteInClause}))
               OR (M2.COD_MEDIDA = '0080' AND M2.COD_STAT_USU IN (${statusPendenteInClause}))
               OR (M2.COD_MEDIDA IN (${cadeia0019InClause})) )
      )

    UNION ALL
    SELECT
        '0019/0032 concluída sem andamento',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0032' AND M.COD_STAT_USU = 'CONC'${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_STAT_USU <> 'CANC'
            AND ( (M2.COD_MEDIDA = '0021' AND M2.COD_STAT_USU IN (${statusPendenteInClause}))
               OR (M2.COD_MEDIDA = '0086' AND M2.COD_STAT_USU IN (${statusPendenteInClause}))
               OR (M2.COD_MEDIDA IN (${cadeia0032InClause})) )
      )

    UNION ALL
    SELECT
        '0020/0021 concluída sem andamento',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0020' AND M.COD_STAT_USU = 'CONC'${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_STAT_USU <> 'CANC'
            AND ( (M2.COD_MEDIDA = '0080' AND M2.COD_STAT_USU IN (${statusPendenteInClause}))
               OR (M2.COD_MEDIDA IN (${cadeia0019InClause})) )
      )

    UNION ALL
    SELECT
        '0020/0021 concluída sem andamento',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0021' AND M.COD_STAT_USU = 'CONC'${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_STAT_USU <> 'CANC'
            AND ( (M2.COD_MEDIDA = '0086' AND M2.COD_STAT_USU IN (${statusPendenteInClause}))
               OR (M2.COD_MEDIDA IN (${cadeia0032InClause})) )
      )

    UNION ALL
    SELECT
        '0080/0086 concluída sem andamento',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0080' AND M.COD_STAT_USU = 'CONC'${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_STAT_USU <> 'CANC'
            AND M2.COD_MEDIDA IN (${cadeia0019InClause})
      )

    UNION ALL
    SELECT
        '0080/0086 concluída sem andamento',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0086' AND M.COD_STAT_USU = 'CONC'${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_STAT_USU <> 'CANC'
            AND M2.COD_MEDIDA IN (${cadeia0032InClause})
      )

    UNION ALL
    SELECT
        'Resposta (0550/0501/0590) com 0020/0080 ainda pendente',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA IN (${tipo5RespostaInClause})
      AND ${tipo5MedidaNaoCancelada}${filtroBase}
      AND EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA
            AND M.DAT_SOLIC >= M2.DAT_SOLIC
            AND M2.COD_MEDIDA IN (${tipo5PendenteInClause})
            AND ${tipo5PendenteStatus}
      )

    UNION ALL
    SELECT
        'Resposta (0595/0596) com 0021/0086 ainda pendente',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA IN (${tipo6RespostaInClause})
      AND ${tipo6MedidaNaoCancelada}${filtroBase}
      AND EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA
            AND M.DAT_SOLIC >= M2.DAT_SOLIC
            AND M2.COD_MEDIDA IN (${tipo6PendenteInClause})
            AND ${tipo6PendenteStatus}
      )

    UNION ALL
    SELECT
        '0080 pendente sem medida 0070',${colunas}
    FROM TBL_MEDIDAS M
    INNER JOIN TBL_NOTAS N ON M.NUM_NOTA = N.NUM_NOTA
    WHERE M.COD_MEDIDA = '0080' AND M.COD_STAT_USU IN (${statusPendenteInClause})${filtroBase}
      AND NOT EXISTS (
          SELECT 1 FROM TBL_MEDIDAS M2
          WHERE M2.NUM_NOTA = M.NUM_NOTA AND M2.COD_MEDIDA = '0070'
      )
    ) X
    WHERE X.COD_SERVICO IN (${servicoInClause})
    ORDER BY TIPO_INCONSISTENCIA, NUM_NOTA;
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = { buscarInconsistencias };
