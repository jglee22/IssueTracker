import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { createActivity } from '../utils/activity';

const router = Router();

// 전체 통계 조회 (대시보드 요약 카드용)
router.get('/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // 사용자가 접근 가능한 프로젝트 ID 목록
    const accessibleProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    const projectIds = accessibleProjects.map(p => p.id);

    // 전체 프로젝트 수
    const totalProjects = accessibleProjects.length;

    // 전체 이슈 수
    const totalIssues = await prisma.issue.count({
      where: {
        projectId: { in: projectIds },
      },
    });

    // 진행 중 이슈 수
    const inProgressIssues = await prisma.issue.count({
      where: {
        projectId: { in: projectIds },
        status: 'IN_PROGRESS',
      },
    });

    // 해결률 계산 (RESOLVED + CLOSED / 전체)
    const resolvedIssues = await prisma.issue.count({
      where: {
        projectId: { in: projectIds },
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
    });
    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    res.json({
      totalProjects,
      totalIssues,
      inProgressIssues,
      resolutionRate,
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 모든 프로젝트 조회 (인증 필요) - 소유한 프로젝트 + 멤버로 참여한 프로젝트
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            issues: true,
          },
        },
        issues: {
          select: {
            status: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
        activities: {
          select: {
            type: true,
            createdAt: true,
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 각 프로젝트에 대한 상태별 이슈 수 계산
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const statusCounts = await prisma.issue.groupBy({
          by: ['status'],
          where: { projectId: project.id },
          _count: { id: true },
        });

        const statusData = {
          OPEN: statusCounts.find((s) => s.status === 'OPEN')?._count.id || 0,
          IN_PROGRESS: statusCounts.find((s) => s.status === 'IN_PROGRESS')?._count.id || 0,
          RESOLVED: statusCounts.find((s) => s.status === 'RESOLVED')?._count.id || 0,
          CLOSED: statusCounts.find((s) => s.status === 'CLOSED')?._count.id || 0,
        };

        const totalIssues = Object.values(statusData).reduce((sum, count) => sum + count, 0);
        const resolvedCount = statusData.RESOLVED + statusData.CLOSED;
        const resolutionRate = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;

        // 마지막 업데이트 날짜 (이슈 또는 프로젝트)
        const lastIssueUpdate = project.issues[0]?.updatedAt;
        const lastUpdate = lastIssueUpdate && lastIssueUpdate > project.updatedAt 
          ? lastIssueUpdate 
          : project.updatedAt;

        // 최근 활동
        const recentActivity = project.activities[0];

        return {
          ...project,
          statusData,
          resolutionRate,
          lastUpdate,
          recentActivity,
        };
      })
    );

    res.json({ projects: projectsWithStats });
  } catch (error) {
    console.error('Get projects error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage,
      // 개발 환경에서만 상세 정보 제공
      ...(process.env.NODE_ENV !== 'production' && { details: errorDetails })
    });
  }
});

// 프로젝트 상세 조회
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 프로젝트 조회 (먼저 프로젝트 존재 여부 확인)
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            issues: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 접근 권한 확인 (소유자 또는 멤버)
    const isOwner = project.ownerId === userId;
    let isMember = false;
    let memberRole: 'MEMBER' | 'VIEWER' | null = null;

    if (!isOwner) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: id,
            userId,
          },
        },
      });
      if (member) {
        isMember = true;
        memberRole = member.role as 'MEMBER' | 'VIEWER';
      }
    }

    // 접근 권한이 없으면 403 반환
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to access this project' });
    }

    // 사용자의 역할 확인
    const userRole: 'OWNER' | 'MEMBER' | 'VIEWER' = isOwner ? 'OWNER' : (memberRole || 'VIEWER');

    res.json({ project, userRole });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 통계 조회
router.get('/:id/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 프로젝트 조회 및 권한 확인
    const project = await prisma.project.findUnique({
      where: { id },
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
            projectId: id,
            userId,
          },
        },
      });
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to access this project' });
    }

    // 상태별 이슈 개수
    const statusCounts = await prisma.issue.groupBy({
      by: ['status'],
      where: { projectId: id },
      _count: { id: true },
    });

    // 우선순위별 이슈 개수
    const priorityCounts = await prisma.issue.groupBy({
      by: ['priority'],
      where: { projectId: id },
      _count: { id: true },
    });

    // 나에게 할당된 이슈 수
    const myIssuesCount = await prisma.issue.count({
      where: {
        projectId: id,
        assigneeId: userId,
      },
    });

    // 최근 업데이트된 이슈 (최근 10개)
    const recentIssues = await prisma.issue.findMany({
      where: { projectId: id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    // 통계 데이터 포맷팅
    const statusData = [
      { name: '열림', value: statusCounts.find((s) => s.status === 'OPEN')?._count.id || 0, status: 'OPEN' },
      { name: '진행 중', value: statusCounts.find((s) => s.status === 'IN_PROGRESS')?._count.id || 0, status: 'IN_PROGRESS' },
      { name: '해결됨', value: statusCounts.find((s) => s.status === 'RESOLVED')?._count.id || 0, status: 'RESOLVED' },
      { name: '닫힘', value: statusCounts.find((s) => s.status === 'CLOSED')?._count.id || 0, status: 'CLOSED' },
    ];

    const priorityData = [
      { name: '낮음', value: priorityCounts.find((p) => p.priority === 'LOW')?._count.id || 0, priority: 'LOW' },
      { name: '보통', value: priorityCounts.find((p) => p.priority === 'MEDIUM')?._count.id || 0, priority: 'MEDIUM' },
      { name: '높음', value: priorityCounts.find((p) => p.priority === 'HIGH')?._count.id || 0, priority: 'HIGH' },
      { name: '긴급', value: priorityCounts.find((p) => p.priority === 'URGENT')?._count.id || 0, priority: 'URGENT' },
    ];

    res.json({
      statusData,
      priorityData,
      myIssuesCount,
      recentIssues,
    });
  } catch (error) {
    console.error('Get project statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 수정
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, description } = req.body;

    // 프로젝트 소유권 확인
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 변경 사항 추적
    const changes: any = {};
    if (name && name.trim() !== existingProject.name) {
      changes.name = { from: existingProject.name, to: name.trim() };
    }
    if (description !== undefined && description?.trim() !== existingProject.description) {
      changes.description = { from: existingProject.description, to: description?.trim() || null };
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // 프로젝트 수정 활동 로그
    if (Object.keys(changes).length > 0) {
      await createActivity({
        type: 'PROJECT_UPDATED',
        userId,
        projectId: id,
        metadata: changes,
      });
    }

    res.json({
      message: 'Project updated successfully',
      project,
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


