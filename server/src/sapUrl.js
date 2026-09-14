const config = require('./config');

function montarUrlSap(numNota) {
  return config.sapNotaUrlTemplate.replace('{NUM_NOTA}', encodeURIComponent(numNota));
}

module.exports = { montarUrlSap };
