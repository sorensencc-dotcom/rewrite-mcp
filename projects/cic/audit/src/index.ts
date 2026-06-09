import express from 'express';

const app = express();
const PORT = process.env.CIC_AUDIT_PORT || 7003;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cic-audit' });
});

app.listen(PORT, () => {
  console.log(`CIC Audit Service listening on port ${PORT}`);
});
