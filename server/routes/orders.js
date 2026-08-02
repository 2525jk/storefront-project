import { Router } from 'express';
import { getOrderBySessionId } from '../db.js';

const router = Router();

router.get('/orders/:sessionId', (req, res) => {
  const order = getOrderBySessionId(req.params.sessionId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

export default router;
