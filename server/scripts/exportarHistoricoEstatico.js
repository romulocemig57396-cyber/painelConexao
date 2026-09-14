const path = require('path');
const fs = require('fs');
const { getPool } = require('../src/db');
const { buscarHistoricoAprovacao } = require('../src/queries/historicoAprovacao');
const { buscarHistoricoLiberacao } = require('../src/queries/historicoLiberacao');
const { buscarHistoricoUniversalizacao } = require('../src/queries/historicoUniversalizacao');

const SAIDA = path.join(__dirname, '..', '..', 'docs', 'data', 'historico.json');

// Os 12 códigos habilitados no filtro (client/src/App.jsx SERVICOS_HISTORICO /
// server/src/config.js regrasHistorico.servicosDisponiveis). Cada um é
// exportado individualmente — o site estático soma as combinações escolhidas
// no cliente (ver docs/js/principal.js), não precisa de combos pré-calculados
// aqui (evitaria uma explosão combinatória de 2^12 conjuntos).
const SERVICOS = [
  'COMT', 'COBT', 'PSAA', 'PSER', 'PSAC', 'PSRP', 'PSAG', 'PSAI', 'PSAF', 'PSSG', 'PSIP', 'PSST',
];

// 'TODOS' == sem filtro de mercado (mesmo comportamento do combo "Todos" no
// client React: string vazia -> filtros.mercado undefined -> URBANO+RURAL juntos).
// Mercado continua só 2 opções, então os 3 buckets pré-calculados bastam (ao
// contrário de serviço, não precisa somar no cliente).
const MERCADOS = [
  { chave: 'TODOS', valor: undefined },
  { chave: 'URBANO', valor: 'URBANO' },
  { chave: 'RURAL', valor: 'RURAL' },
];

// As 3 queries retornam só contagens agregadas por MES/categoria (COUNT(*) com
// GROUP BY) — nenhuma coluna de nota, matrícula ou qualquer dado individual.
async function buscarCombinacao(pool, servico, mercado) {
  const filtros = { servico: [servico], mercado };
  const [aprovacao, liberacao, universalizacao] = await Promise.all([
    buscarHistoricoAprovacao(pool, filtros),
    buscarHistoricoLiberacao(pool, filtros),
    buscarHistoricoUniversalizacao(pool, filtros),
  ]);
  return { aprovacao, liberacao, universalizacao };
}

async function main() {
  const pool = await getPool();
  try {
    const dados = {};
    for (const servico of SERVICOS) {
      dados[servico] = {};
      for (const { chave, valor } of MERCADOS) {
        console.log(`Exportando ${servico} / ${chave}...`);
        dados[servico][chave] = await buscarCombinacao(pool, servico, valor);
      }
    }

    const payload = {
      geradoEm: new Date().toISOString(),
      servicos: SERVICOS,
      mercados: MERCADOS.map((m) => m.chave),
      dados,
    };

    fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
    fs.writeFileSync(SAIDA, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`OK: ${SAIDA} gerado com sucesso (${payload.servicos.length * payload.mercados.length} combinações).`);
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
    console.error('ERRO ao exportar histórico estático:', err.message);
    process.exitCode = 1;
  });
