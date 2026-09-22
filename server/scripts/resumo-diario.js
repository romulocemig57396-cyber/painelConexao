require('../src/confiarCertificadosWindows');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../src/db');
const config = require('../src/config');
const { buscarMedidasPendentes } = require('../src/queries/medidasPendentes');
const { buscarResumoMedidas } = require('../src/queries/medidasResumo');
const { buscarResumoGrupo2 } = require('../src/queries/medidasGrupo2Resumo');

const LOG_PATH = path.join(__dirname, '..', 'logs', 'resumo-diario.log');

function log(linha) {
  const timestamp = new Date().toISOString();
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${timestamp} ${linha}\n`);
}

// Mesma conta do useMemo de client/src/App.jsx — não dá pra importar o JSX
// num script Node, então essa aritmética (não a query) é reescrita aqui.
function calcularTotais(rows) {
  const totalPendentes = rows.length;
  const emAtraso = rows.filter((r) => (r.DES_SITUACAO || '').toUpperCase().includes('ATRASO')).length;
  const areasEnvolvidas = new Set(
    rows.filter((r) => r.TEM_PENDENCIA_GRUPO2 === 'SIM').map((r) => r.NUM_NOTA),
  ).size;
  return { totalPendentes, emAtraso, areasEnvolvidas };
}

async function main() {
  const url = process.env.PORTAL_RESUMO_URL;
  const apiKey = process.env.PORTAL_RESUMO_API_KEY;
  if (!url || !apiKey) {
    throw new Error('PORTAL_RESUMO_URL/PORTAL_RESUMO_API_KEY não configurados em server/.env');
  }

  const pool = await getPool();
  try {
    // Mesmas 3 queries do painel, sem filtros (usa os defaults de config.regrasNegocio).
    const [rows, resumoMedidas, resumoGrupo2Medidas] = await Promise.all([
      buscarMedidasPendentes(pool),
      buscarResumoMedidas(pool),
      buscarResumoGrupo2(pool),
    ]);

    const { totalPendentes, emAtraso, areasEnvolvidas } = calcularTotais(rows);
    const { grupo1Medidas, grupo2Medidas, statusPendente } = config.regrasNegocio;

    // Portal espera resumoPorCodigo/resumoGrupo2 empacotados com os códigos e
    // status usados na consulta (mesmo formato que MedidasBarChart.jsx monta
    // no frontend a partir de resumo+codigos+statusList), não o array puro.
    const payload = {
      data: new Date().toISOString().slice(0, 10),
      totalPendentes,
      emAtraso,
      areasEnvolvidas,
      resumoPorCodigo: {
        resumo: resumoMedidas,
        codigos: grupo1Medidas,
        statusList: statusPendente,
      },
      resumoGrupo2: {
        resumo: resumoGrupo2Medidas,
        codigos: grupo2Medidas,
        statusList: statusPendente,
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      throw new Error(`Portal respondeu ${resp.status}: ${corpo.slice(0, 300)}`);
    }

    log(
      `OK totalPendentes=${totalPendentes} emAtraso=${emAtraso} areasEnvolvidas=${areasEnvolvidas} status=${resp.status}`,
    );
  } finally {
    await pool.close();
  }
}

// Usa process.exitCode (não process.exit()) de propósito: forçar a saída
// imediatamente depois do pool.close() derruba handles nativos do mssql/fetch
// ainda em fechamento e crasha o processo ("Assertion failed:
// !(handle->flags & UV_HANDLE_CLOSING)", libuv). Com exitCode, o Node só sai
// quando o event loop esvazia sozinho — sem essa corrida.
main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    log(`ERRO ${err.message}`);
    process.exitCode = 1;
  });
