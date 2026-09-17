const express = require('express');
const painelPublico = require('../services/painelPublico');

const router = express.Router();

router.post('/painel-publico/atualizar', (_req, res) => {
  if (!painelPublico.iniciar()) {
    res.status(409).json({ error: 'A atualização do painel público já está em andamento.', data: painelPublico.status() });
    return;
  }
  res.status(202).json({ data: painelPublico.status() });
});

router.get('/painel-publico/atualizacao', (_req, res) => {
  res.json({ data: painelPublico.status() });
});

module.exports = router;
