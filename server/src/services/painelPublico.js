const path = require('path');
const { execFile } = require('child_process');

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

// Site estático (GitHub Pages) aposentado — o painel externo agora mora no
// Portal Conexão MT (server/scripts/exportarPainelExterno.js faz o POST via
// HTTP), então não tem mais git/PUBLIC_REPO_DIR/docs envolvido nesse fluxo.
async function atualizar() {
  const raiz = path.join(__dirname, '..', '..', '..');
  const script = path.join(raiz, 'server', 'scripts', 'exportarPainelExterno.js');
  await executar(process.execPath, [script], raiz);
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
