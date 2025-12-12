import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// 알림 목록 조회
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { unreadOnly, limit } = req.query;

    const take = limit ? Math.min(parseInt(limit as string, 10) || 20, 100) : 20;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly === 'true' ? { read: false } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 단건 읽음 처리
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const notif = await prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        read: true,
      },
    });

    if (notif.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 모두 읽음 처리
router.post('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

