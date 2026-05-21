'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

const BLACKBOARD_PATH = path.resolve(
  __dirname,
  '../../../projects/cic/orchestrator/data/mas-blackboard.json'
);

router.get('/decisions', (req, res) => {
  if (!fs.existsSync(BLACKBOARD_PATH)) {
    return res.json({ ok: true, decisions: [], reason: 'no_data_yet' });
  }

  try {
    const raw  = fs.readFileSync(BLACKBOARD_PATH, 'utf8');
    const data = JSON.parse(raw);
    res.json({ ok: true, decisions: data.decisions || [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to read MAS decisions', details: err.message });
  }
});

router.get('/blackboard', (req, res) => {
  if (!fs.existsSync(BLACKBOARD_PATH)) {
    return res.json({ ok: true, blackboard: null, reason: 'no_data_yet' });
  }

  try {
    const raw  = fs.readFileSync(BLACKBOARD_PATH, 'utf8');
    const data = JSON.parse(raw);
    res.json({ ok: true, blackboard: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to read MAS blackboard', details: err.message });
  }
});

module.exports = router;
