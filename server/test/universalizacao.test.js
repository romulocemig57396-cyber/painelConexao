// Testes do filtro "Universalização" (sem tocar no SQL Server):
//  - o CASE é a única definição, usado pelo gráfico do Histórico e pelo filtro;
//  - sem o filtro, o SQL das consultas não ganha nenhuma condição nova;
//  - as regras das rotas (ausente = sem filtro, lista vazia = resposta vazia sem
//    consultar o banco, valor inválido no Histórico = 400);
//  - as 5 categorias particionam as notas (uma nota em exatamente uma categoria,
//    soma das cinco = total) — executado num SQLite em memória, quando disponível.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const sql = require('mssql');

const config = require('../src/config');

// ---------- banco falso: guarda cada consulta e seus parâmetros ----------
const consultas = [];
function criarRequest() {
  const r = {
    params: {},
    input(nome, _tipo, valor) {
      r.params[nome] = valor;
      return r;
    },
    async query(texto) {
      consultas.push({ sql: texto.replace(/\s+/g, ' ').trim(), params: { ...r.params } });
      return { recordset: [] };
    },
  };
  return r;
}
const poolFalso = { request: criarRequest };

// As rotas importam ../db; troca por um módulo que devolve o pool falso (mantém o `sql` real).
const caminhoDb = require.resolve('../src/db');
require.cache[caminhoDb] = {
  id: caminhoDb,
  filename: caminhoDb,
  loaded: true,
  exports: { sql, getPool: async () => poolFalso },
};

const { universalizacaoCase, condFiltrosSolicitacao } = require('../src/queries/tipoSolicitacao');
const medidasRouter = require('../src/routes/medidas');
const historicoRouter = require('../src/routes/historico');

const CATEGORIAS = config.regrasNegocio.universalizacaoDisponiveis;
const normalizar = (texto) => texto.replace(/\s+/g, ' ').trim();

async function iniciarApi() {
  const app = express();
  app.use('/api', historicoRouter);
  app.use('/api', medidasRouter);
  const servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { base, fechar: () => new Promise((ok) => servidor.close(ok)) };
}

async function chamar(base, caminho) {
  consultas.length = 0;
  const resp = await fetch(`${base}${caminho}`);
  return { status: resp.status, corpo: await resp.json(), consultas: [...consultas] };
}

const temParametroUn = (consulta) => Object.keys(consulta.params).some((nome) => nome.startsWith('un_'));

test('as 5 categorias são as mesmas do gráfico "Universalização de obras"', () => {
  assert.deepEqual(CATEGORIAS, [
    'UNIVERSALIZADA',
    'NAO_UNIVERSALIZADA',
    'FORA_UNIVERSALIZACAO',
    'SEGURANCA',
    'OUTROS',
  ]);
  assert.deepEqual(config.regrasHistorico.universalizacaoDisponiveis, CATEGORIAS);
});

test('universalizacaoCase é idempotente por request (parâmetros registrados uma vez)', () => {
  const request = criarRequest();
  const registros = [];
  const inputOriginal = request.input;
  request.input = (nome, tipo, valor) => {
    registros.push(nome);
    return inputOriginal(nome, tipo, valor);
  };
  const a = universalizacaoCase(request);
  const quantidade = registros.length;
  const b = universalizacaoCase(request);
  assert.equal(a, b);
  assert.equal(registros.length, quantidade, 'segunda chamada não pode registrar parâmetros de novo');
  assert.ok(quantidade > 0);
  for (const categoria of CATEGORIAS.filter((c) => c !== 'OUTROS')) {
    assert.ok(a.includes(`THEN '${categoria}'`), `CASE deve produzir ${categoria}`);
  }
  assert.ok(a.includes("ELSE 'OUTROS'"));
});

test('condFiltrosSolicitacao: sem universalizacao não gera condição nem parâmetro', () => {
  const request = criarRequest();
  const cond = condFiltrosSolicitacao(request, { tipoSolicitacao: ['LN'] });
  assert.ok(!cond.includes('COD_UNIVERSALIZACAO'));
  assert.ok(!Object.keys(request.params).some((n) => n.startsWith('un_')));
});

test('condFiltrosSolicitacao: com universalizacao usa o mesmo CASE e parâmetros un_', () => {
  const request = criarRequest();
  const cond = condFiltrosSolicitacao(request, { universalizacao: ['SEGURANCA', 'OUTROS'] });
  assert.ok(normalizar(cond).includes(normalizar(universalizacaoCase(request))));
  assert.match(cond, /IN \(@un_0, @un_1\)/);
  assert.equal(request.params.un_0, 'SEGURANCA');
  assert.equal(request.params.un_1, 'OUTROS');
});

test('o gráfico de universalização do Histórico usa a mesma expressão do filtro', async () => {
  const { buscarHistoricoUniversalizacao } = require('../src/queries/historicoUniversalizacao');
  consultas.length = 0;
  await buscarHistoricoUniversalizacao(poolFalso, {});
  const semFiltro = consultas[0];
  assert.ok(semFiltro.sql.includes(normalizar(universalizacaoCase(criarRequest()))));
  assert.ok(!temParametroUn(semFiltro), 'sem filtro, nenhum parâmetro un_');

  consultas.length = 0;
  await buscarHistoricoUniversalizacao(poolFalso, { universalizacao: ['SEGURANCA'] });
  const comFiltro = consultas[0];
  assert.ok(temParametroUn(comFiltro));
  // CASE aparece no SELECT (categoria) e no WHERE (filtro): mesmos parâmetros, registrados uma vez.
  const trecho = normalizar(universalizacaoCase(criarRequest()));
  assert.equal(comFiltro.sql.split(trecho).length - 1, 2);
});

test('Histórico: ausente = sem filtro; valor válido filtra; inválido = 400; lista vazia = vazio sem consultar o banco', async () => {
  const api = await iniciarApi();
  try {
    let r = await chamar(api.base, '/api/historico/universalizacao');
    assert.equal(r.status, 200);
    assert.ok(r.consultas.length > 0);
    assert.ok(!r.consultas.some(temParametroUn));

    r = await chamar(api.base, '/api/historico/aprovacao?universalizacao=SEGURANCA,OUTROS');
    assert.equal(r.status, 200);
    assert.equal(r.consultas.length, 1);
    assert.equal(r.consultas[0].params.un_0, 'SEGURANCA');
    assert.equal(r.consultas[0].params.un_1, 'OUTROS');

    r = await chamar(api.base, '/api/historico/liberacao?universalizacao=NAO_EXISTE');
    assert.equal(r.status, 400);
    assert.equal(r.consultas.length, 0);

    for (const rota of ['aprovacao', 'liberacao', 'universalizacao']) {
      r = await chamar(api.base, `/api/historico/${rota}?universalizacao=`);
      assert.equal(r.status, 200);
      assert.deepEqual(r.corpo.data, []);
      assert.equal(r.consultas.length, 0, `${rota}: lista vazia não pode consultar o banco`);
    }

    r = await chamar(api.base, '/api/historico/valor-obra?universalizacao=');
    assert.equal(r.status, 200);
    assert.equal(r.corpo.data.aprovacao.valorObra, 0);
    assert.equal(r.consultas.length, 0);

    r = await chamar(api.base, '/api/historico/valor-obra?universalizacao=SEGURANCA');
    assert.equal(r.status, 200);
    assert.ok(r.consultas.length > 0);
    assert.ok(r.consultas.every((c) => c.params.un_0 === 'SEGURANCA'));
  } finally {
    await api.fechar();
  }
});

test('Medidas: ausente = sem filtro; valor filtra; lista vazia = resposta vazia sem consultar o banco', async () => {
  const api = await iniciarApi();
  try {
    const rotas = ['/api/medidas', '/api/medidas/resumo', '/api/medidas/resumo-grupo2', '/api/medidas/resumo-0070-regional'];
    for (const rota of rotas) {
      let r = await chamar(api.base, rota);
      assert.equal(r.status, 200, rota);
      assert.equal(r.consultas.length, 1, rota);
      assert.ok(!temParametroUn(r.consultas[0]), `${rota}: sem parâmetro, sem filtro`);

      r = await chamar(api.base, `${rota}?universalizacao=SEGURANCA`);
      assert.equal(r.status, 200, rota);
      assert.equal(r.consultas.length, 1, rota);
      assert.equal(r.consultas[0].params.un_0, 'SEGURANCA', rota);

      r = await chamar(api.base, `${rota}?universalizacao=`);
      assert.equal(r.status, 200, rota);
      assert.deepEqual(r.corpo.data, [], rota);
      assert.equal(r.consultas.length, 0, `${rota}: lista vazia não pode consultar o banco`);
    }

    let r = await chamar(api.base, '/api/medidas/valor-obra?universalizacao=');
    assert.deepEqual(r.corpo.data, { notas: 0, valorObra: 0 });
    assert.equal(r.consultas.length, 0);

    r = await chamar(api.base, '/api/medidas/valor-obra?universalizacao=FORA_UNIVERSALIZACAO');
    assert.equal(r.consultas.length, 1);
    assert.equal(r.consultas[0].params.un_0, 'FORA_UNIVERSALIZACAO');
  } finally {
    await api.fechar();
  }
});

test('categorias particionam as notas: cada nota em exatamente uma, soma das cinco = total', async (t) => {
  let sqlite;
  try {
    sqlite = require('node:sqlite');
  } catch {
    t.skip('node:sqlite indisponível nesta versão do Node');
    return;
  }
  const { universalizadaCodigos, naoUniversalizadaCodigos, foraUniversalizacaoCodigos, segurancaCodigos } =
    config.regrasHistorico.universalizacao;

  // Notas de teste: cada código configurado, mais nulo, vazio, espaço e códigos desconhecidos.
  const codigos = [
    ...universalizadaCodigos, ...universalizadaCodigos,
    ...naoUniversalizadaCodigos,
    ...foraUniversalizacaoCodigos, ...foraUniversalizacaoCodigos, ...foraUniversalizacaoCodigos,
    ...segurancaCodigos,
    null, null, '', ' ', 'ZZ', '99',
  ];
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec('CREATE TABLE N (NUM_NOTA INTEGER, COD_UNIVERSALIZACAO TEXT)');
  const inserir = db.prepare('INSERT INTO N VALUES (?, ?)');
  codigos.forEach((codigo, i) => inserir.run(i + 1, codigo));

  // Troca @parametro pelo literal, pra rodar o SQL gerado como está.
  const literal = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const executavel = (textoSql, params) => textoSql.replace(/@(\w+)/g, (_m, nome) => literal(params[nome]));

  const request = criarRequest();
  const caseSql = universalizacaoCase(request);
  const porCategoria = db
    .prepare(executavel(`SELECT ${caseSql} AS CAT, COUNT(*) AS QTD FROM N GROUP BY CAT`, request.params))
    .all();
  const contagem = Object.fromEntries(porCategoria.map((l) => [l.CAT, l.QTD]));

  const total = codigos.length;
  assert.equal(Object.values(contagem).reduce((a, b) => a + b, 0), total, 'soma das categorias = total');
  assert.ok(Object.keys(contagem).every((c) => CATEGORIAS.includes(c)), 'só categorias conhecidas');
  assert.equal(contagem.UNIVERSALIZADA, universalizadaCodigos.length * 2);
  assert.equal(contagem.NAO_UNIVERSALIZADA, naoUniversalizadaCodigos.length);
  assert.equal(contagem.FORA_UNIVERSALIZACAO, foraUniversalizacaoCodigos.length * 3);
  assert.equal(contagem.SEGURANCA, segurancaCodigos.length);
  assert.equal(contagem.OUTROS, 6, 'nulo, vazio, espaço e códigos desconhecidos caem em OUTROS');

  // Marcando uma categoria por vez (o filtro real): cada uma devolve exatamente o seu grupo; as cinco somam o total.
  let somaDoFiltro = 0;
  for (const categoria of CATEGORIAS) {
    const req = criarRequest();
    const cond = condFiltrosSolicitacao(req, { universalizacao: [categoria] });
    const { QTD } = db
      .prepare(executavel(`SELECT COUNT(*) AS QTD FROM N WHERE 1=1 ${cond}`, req.params))
      .get();
    assert.equal(QTD, contagem[categoria] ?? 0, `filtro ${categoria}`);
    somaDoFiltro += QTD;
  }
  assert.equal(somaDoFiltro, total, 'soma das cinco seleções individuais = total');

  // Todas marcadas: o filtro deixa passar tudo.
  const reqTodas = criarRequest();
  const condTodas = condFiltrosSolicitacao(reqTodas, { universalizacao: CATEGORIAS });
  const { QTD: todas } = db
    .prepare(executavel(`SELECT COUNT(*) AS QTD FROM N WHERE 1=1 ${condTodas}`, reqTodas.params))
    .get();
  assert.equal(todas, total);
  db.close();
});
