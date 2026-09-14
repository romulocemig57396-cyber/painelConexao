const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const medidasRouter = require('./routes/medidas');
const healthRouter = require('./routes/health');
const debugRouter = require('./routes/debug');
const ultimaAtualizacaoRouter = require('./routes/ultimaAtualizacao');
const inconsistenciasRouter = require('./routes/inconsistencias');
const historicoRouter = require('./routes/historico');

const app = express();

app.use(cors());
app.use(express.json());

// Liveness simples do processo (não toca no banco). Para validar a conexão com
// o SQL Server, use GET /api/health/db.
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', healthRouter);
app.use('/api', debugRouter);
app.use('/api', ultimaAtualizacaoRouter);
app.use('/api', inconsistenciasRouter);
app.use('/api', historicoRouter);
app.use('/api', medidasRouter);

// Rota /api/* desconhecida => 404 json, em vez de cair no fallback do SPA abaixo.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Build de produção do frontend (client/dist, gerado por `npm run build`).
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`API rodando em http://localhost:${config.port} (escutando em 0.0.0.0)`);
});
