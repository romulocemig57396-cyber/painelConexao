const path = require('path');
const { execFile } = require('child_process');
const config = require('../config');

let job = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  error: null,
};

function executar(comando, args, cwd, env = process.env) {
  return new Promise((resolve, reject) => {
    execFile(comando, args, {
      cwd,
      env,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        const detalhe = (stderr || stdout || error.message).trim();
        error.message = detalhe;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function atualizar() {
  const raiz = path.join(__dirname, '..', '..', '..');
  const docs = path.resolve(process.env.PUBLIC_REPO_DIR || path.join(raiz, 'docs'));
  const script = path.join(raiz, 'server', 'scripts', 'exportarHistoricoEstatico.js');

  try {
    await executar('git', ['rev-parse', '--show-toplevel'], docs);
  } catch (error) {
    throw new Error(
      `Repositório do painel público não encontrado em "${docs}". ` +
        'Configure PUBLIC_REPO_DIR no server/.env apontando para o clone do painel público.',
    );
  }

  await executar(process.execPath, [script], raiz, {
    ...process.env,
    PUBLIC_DATA_PATH: path.join(docs, 'data', 'historico.json'),
  });
  await executar('git', ['pull', '--ff-only'], docs);
  await executar('git', ['add', 'data/historico.json'], docs);

  const diff = await executar('git', ['diff', '--cached', '--quiet'], docs)
    .then(() => false)
    .catch((error) => {
      if (error.code === 1) return true;
      throw error;
    });

  if (!diff) return;

  await executar(
    'git',
    [
      'commit',
      '-m',
      `Atualizacao automatica dos dados - ${new Date().toLocaleString('pt-BR')}`,
    ],
    docs,
  );
  await executar('git', ['push'], docs);
}

function iniciar() {
  if (job.status === 'running') return false;

  job = {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };

  atualizar()
    .then(() => {
      job = { ...job, status: 'success', finishedAt: new Date().toISOString() };
    })
    .catch((error) => {
      console.error('Erro ao atualizar painel público:', error);
      job = {
        ...job,
        status: 'error',
        finishedAt: new Date().toISOString(),
        error: error.message,
      };
    });

  return true;
}

function status() {
  return { ...job };
}

module.exports = { iniciar, status };
