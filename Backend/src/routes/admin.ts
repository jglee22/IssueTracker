import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import { createNotification } from '../utils/notification';

const router = Router();

// 사용자 목록 (관리자 전용)
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        role: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 사용자 승인 (ACTIVE로 전환)
router.post('/users/:id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role?: 'ADMIN' | 'MEMBER' };

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        rejectionReason: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        role: true,
        rejectionReason: true,
        updatedAt: true,
      },
    });

    // 알림: 승인
    await createNotification({
      userId: user.id,
      type: 'USER_APPROVED',
      title: '계정이 승인되었습니다',
      body: '이제 서비스에 로그인할 수 있습니다.',
    });

    res.json({ message: 'User approved', user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 사용자 거절 (REJECTED로 전환)
router.post('/users/:id/reject', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        role: true,
        rejectionReason: true,
        updatedAt: true,
      },
    });

    // 알림: 거절
    await createNotification({
      userId: user.id,
      type: 'USER_REJECTED',
      title: '계정 가입이 거절되었습니다',
      body: reason ? `사유: ${reason}` : undefined,
    });

    res.json({ message: 'User rejected', user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

