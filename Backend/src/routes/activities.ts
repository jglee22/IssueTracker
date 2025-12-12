import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// 프로젝트 활동 로그 조회
router.get('/projects/:projectId/activities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;
    const { limit = 50 } = req.query;

    // 프로젝트 조회 및 권한 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 접근 권한 확인 (소유자 또는 멤버)
    const isOwner = project.ownerId === userId;
    let isMember = false;

    if (!isOwner) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to access this project' });
    }

    // 활동 로그 조회
    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        issue: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string, 10),
    });

    res.json({ activities });
  } catch (error) {
    console.error('Get project activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 이슈 활동 로그 조회
router.get('/issues/:issueId/activities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { issueId } = req.params;

    // 이슈 조회 및 권한 확인
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // 프로젝트 접근 권한 확인
    const isOwner = issue.project.ownerId === userId;
    let isMember = false;

    if (!isOwner) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: issue.project.id,
            userId,
          },
        },
      });
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to access this issue' });
    }

    // 활동 로그 조회
    const activities = await prisma.activity.findMany({
      where: { issueId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ activities });
  } catch (error) {
    console.error('Get issue activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

