import { Router } from 'express';
import { getArlTrace, getArlComposite, getArlDrift } from '../services/arlStore';

const router = Router();

router.get('/arl/trace/:id', async (req, res) => {
  const { id } = req.params;
  const trace = await getArlTrace(id);
  res.json({ trace });
});

router.get('/arl/composite/:id', async (req, res) => {
  const { id } = req.params;
  const composite = await getArlComposite(id);
  res.json({ composite });
});

router.get('/arl/drift/:id', async (req, res) => {
  const { id } = req.params;
  const drift = await getArlDrift(id);
  res.json({ drift });
});

export default router;
