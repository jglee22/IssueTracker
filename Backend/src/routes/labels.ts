import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// 모든 라벨 조회
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labels = await prisma.label.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ labels });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 라벨 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    const label = await prisma.label.create({
      data: {
        name: name.trim(),
        color: color || '#3B82F6',
      },
    });

    res.status(201).json({
      message: 'Label created successfully',
      label,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Label with this name already exists' });
    }
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 라벨 수정
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const existingLabel = await prisma.label.findUnique({
      where: { id },
    });

    if (!existingLabel) {
      return res.status(404).json({ error: 'Label not found' });
    }

    const label = await prisma.label.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
      },
    });

    res.json({
      message: 'Label updated successfully',
      label,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Label with this name already exists' });
    }
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 라벨 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const label = await prisma.label.findUnique({
      where: { id },
    });

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await prisma.label.delete({
      where: { id },
    });

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

