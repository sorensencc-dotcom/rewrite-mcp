const express = require('express');
const regionsConfig = require('../regions.json');
const { fetchWithRetry } = require('../utils/fetch');

const router = express.Router();
const regions = regionsConfig.regions;

router.get('/', (req, res) => {
  res.json({ regions });
});

router.get('/:regionId/agents', async (req, res) => {
  const region = regions.find(r => r.id === req.params.regionId);
  if (!region) return res.status(404).json({ error: 'unknown region' });

  try {
    const r = await fetchWithRetry(`${region.baseUrl}/agents`);
    const data = await r.json();
    res.json({ region: region.id, ...data });
  } catch (e) {
    res.status(502).json({ error: 'region_unreachable', message: e.message });
  }
});
router.get('/:regionId/health', async (req, res) => {
  const region = regions.find(r => r.id === req.params.regionId);
  if (!region) return res.status(404).json({ error: 'unknown region' });

  try {
    const r = await fetchWithRetry(`${region.baseUrl}/health`);
    const data = await r.json();
    res.json({ region: region.id, ...data });
  } catch (e) {
    res.status(502).json({ error: 'region_unreachable', message: e.message });
  }
});

module.exports = router;
