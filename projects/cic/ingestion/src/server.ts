import express from 'express';
import cognitionArlRoutes from './api/cognitionArlRoutes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/cognition', cognitionArlRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
