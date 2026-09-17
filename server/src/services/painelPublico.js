const path = require('path');
const { execFile } = require('child_process');
const config = require('../config');

let job = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  error: null,
};

function executar(comando, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(comando, args, { cwd, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
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
  const docs = path.join(raiz, 'docs');
  const script = path.join(raiz, 'server', 'scripts', 'exportarHistoricoEstatico.js');

  await executar(process.execPath, [script], raiz);
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
