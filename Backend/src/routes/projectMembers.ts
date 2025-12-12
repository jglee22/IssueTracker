import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { createActivity } from '../utils/activity';
import { createNotification } from '../utils/notification';
import { sendEvent } from '../utils/realtime';

const router = Router();

// 프로젝트 멤버 목록 조회
router.get('/projects/:projectId/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;
    const { q } = req.query; // 검색 쿼리

    // 프로젝트 조회
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

    // 접근 권한이 없으면 403 반환
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to access this project' });
    }

    // 멤버 목록 조회
    const where: any = { projectId };
    if (q && typeof q === 'string') {
      where.user = {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const members = await prisma.projectMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER, MEMBER, VIEWER 순
        { createdAt: 'asc' },
      ],
    });

    // 소유자도 멤버 목록에 포함
    const owner = await prisma.user.findUnique({
      where: { id: project.ownerId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });

    const allMembers = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    }));

    // 소유자가 멤버 목록에 없으면 추가
    if (owner && !allMembers.some((m) => m.userId === owner.id)) {
      allMembers.unshift({
        id: 'owner',
        userId: owner.id,
        role: 'OWNER' as const,
        createdAt: project.createdAt,
        user: owner,
      });
    }

    // 검색 필터 적용
    let filteredMembers = allMembers;
    if (q && typeof q === 'string') {
      const searchLower = q.toLowerCase();
      filteredMembers = allMembers.filter(
        (m) =>
          m.user.username.toLowerCase().includes(searchLower) ||
          m.user.email.toLowerCase().includes(searchLower) ||
          (m.user.name && m.user.name.toLowerCase().includes(searchLower))
      );
    }

    res.json({ members: filteredMembers });
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 멤버 추가
router.post('/projects/:projectId/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;
    const { userId: newUserId, role = 'VIEWER' } = req.body;

    // 프로젝트 소유권 확인 (소유자만 멤버 추가 가능)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }

    // 소유자는 추가할 수 없음
    if (newUserId === project.ownerId) {
      return res.status(400).json({ error: 'Project owner cannot be added as a member' });
    }

    // 이미 멤버인지 확인
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: newUserId,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: newUserId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 멤버 추가
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: newUserId,
        role: role as 'MEMBER' | 'VIEWER',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
          },
        },
      },
    });

    // 멤버 추가 활동 로그
    await createActivity({
      type: 'PROJECT_MEMBER_ADDED',
      userId,
      projectId,
      metadata: {
        addedUserId: newUserId,
        addedUserName: user.username,
        role: role as 'MEMBER' | 'VIEWER',
      },
    });

    // 알림: 새 멤버에게 프로젝트 초대 알림
    await createNotification({
      userId: newUserId,
      type: 'PROJECT_MEMBER_ADDED',
      title: `프로젝트에 초대되었습니다: ${project.name}`,
      body: `역할: ${role}`,
      link: `/projects/${projectId}`,
    });

    // SSE: 새 멤버에게 즉시 전달
    sendEvent(newUserId, {
      type: 'project_member_added',
      payload: {
        projectId,
        role,
      },
    });

    res.status(201).json({
      message: 'Member added successfully',
      member,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 멤버 역할 변경
router.put('/projects/:projectId/members/:memberId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId, memberId } = req.params;
    const { role } = req.body;

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }

    // 멤버 찾기
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== projectId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 소유자 역할은 변경할 수 없음
    if (member.userId === project.ownerId) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // 역할 변경 추적
    const oldRole = member.role;

    // 역할 업데이트
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: role as 'MEMBER' | 'VIEWER' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
          },
        },
      },
    });

    // 역할 변경 활동 로그
    if (oldRole !== role) {
      await createActivity({
        type: 'PROJECT_MEMBER_ROLE_CHANGED',
        userId,
        projectId,
        metadata: {
          memberUserId: member.userId,
          memberUserName: updatedMember.user.username,
          from: oldRole,
          to: role as 'MEMBER' | 'VIEWER',
        },
      });

      // 알림: 역할 변경 대상자에게
      await createNotification({
        userId: member.userId,
        type: 'PROJECT_MEMBER_ROLE_CHANGED',
        title: `프로젝트 역할이 변경되었습니다: ${project.name}`,
        body: `역할: ${oldRole} → ${role}`,
        link: `/projects/${projectId}`,
      });

      // SSE: 역할 변경 알림
      sendEvent(member.userId, {
        type: 'project_member_role_changed',
        payload: {
          projectId,
          from: oldRole,
          to: role,
        },
      });
    }

    res.json({
      message: 'Member role updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    console.error('Update project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 프로젝트 멤버 제거
router.delete('/projects/:projectId/members/:memberId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId, memberId } = req.params;

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }

    // 멤버 찾기
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== projectId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 소유자는 제거할 수 없음
    if (member.userId === project.ownerId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    // 제거할 멤버 정보 조회
    const memberUser = await prisma.user.findUnique({
      where: { id: member.userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
      },
    });

    // 멤버 제거
    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    // 멤버 제거 활동 로그
    if (memberUser) {
      await createActivity({
        type: 'PROJECT_MEMBER_REMOVED',
        userId,
        projectId,
        metadata: {
          removedUserId: member.userId,
          removedUserName: memberUser.username,
          role: member.role,
        },
      });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

