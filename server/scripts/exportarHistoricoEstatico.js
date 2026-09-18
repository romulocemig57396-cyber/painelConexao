const path = require('path');
const fs = require('fs');
const { getPool } = require('../src/db');
const config = require('../src/config');
const { buscarHistoricoAprovacao } = require('../src/queries/historicoAprovacao');
const { buscarHistoricoLiberacao } = require('../src/queries/historicoLiberacao');
const { buscarHistoricoUniversalizacao } = require('../src/queries/historicoUniversalizacao');
const { buscarResumoMedidasPublico } = require('../src/queries/medidasPublicoResumo');

const SAIDA = process.env.PUBLIC_DATA_PATH
  ? path.resolve(process.env.PUBLIC_DATA_PATH)
  : path.join(__dirname, '..', '..', 'docs', 'data', 'historico.json');

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

const REGIONAIS = ['CE', 'LE', 'MQ', 'NE', 'OE', 'SL', 'TR'];

// As queries retornam só contagens agregadas por MES/categoria (COUNT(*) com
// GROUP BY) e as medidas pendentes por código/situação — nenhuma coluna de
// nota, matrícula ou qualquer dado individual.
async function buscarCombinacao(pool, servico, mercado, regional) {
  const filtros = {
    servico: [servico],
    mercado,
    regional: regional === 'TODOS' ? REGIONAIS : [regional],
  };
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
        dados[servico][chave] = {};
        for (const regional of ['TODOS', ...REGIONAIS]) {
          console.log(`Exportando ${servico} / ${chave} / ${regional}...`);
          dados[servico][chave][regional] = await buscarCombinacao(pool, servico, valor, regional);
        }
      }
    }
    console.log('Exportando medidas pendentes...');
    const medidas = await buscarResumoMedidasPublico(pool, SERVICOS, REGIONAIS);

    const payload = {
      geradoEm: new Date().toISOString(),
      servicos: SERVICOS,
      mercados: MERCADOS.map((m) => m.chave),
      regionais: REGIONAIS,
      medidas: {
        linhas: medidas,
        grupo1Medidas: config.regrasNegocio.grupo1Medidas,
        grupo2Medidas: config.regrasNegocio.grupo2Medidas,
      },
      dados,
    };

    fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
    fs.writeFileSync(SAIDA, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`OK: ${SAIDA} gerado com sucesso.`);
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
