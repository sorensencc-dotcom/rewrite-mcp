'use strict';

const express = require('express');
const router = express.Router();
const recoveryControlLoop = require('../../../projects/cic/control-plane/recovery/control-loop');

router.get('/history', (req, res) => {
  res.json({ ok: true, history: recoveryControlLoop.getHistory() });
});

module.exports = router;
