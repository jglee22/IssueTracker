import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { addClient, removeClient } from '../utils/realtime';

const router = Router();

// SSE 구독
router.get('/realtime', (req, res: Response) => {
  try {
    const token = (req.query.token as string) || (req.headers.authorization?.split(' ')[1] ?? '');
    if (!token) {
      return res.status(401).end();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).end();
    }

    // SSE 헤더
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 즉시 연결 확인용 주석 데이터
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    addClient(userId, res);

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeClient(userId, res);
    });
  } catch (error) {
    console.error('Realtime SSE error:', error);
    res.status(401).end();
  }
});

export default router;

