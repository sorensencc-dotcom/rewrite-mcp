const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ pipelines: [] });
});

module.exports = router;
