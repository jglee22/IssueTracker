import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { createActivity } from '../utils/activity';
import { createNotification } from '../utils/notification';
import { broadcastToUsers, getProjectUserIds } from '../utils/realtime';

const router = Router();

// 모든 이슈 조회 (프로젝트별 필터링 가능)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId, status, assigneeId, priority, q } = req.query;

    // 프로젝트 접근 권한 확인 (소유자 또는 멤버)
    const where: any = {};
    
    if (projectId) {
      // 특정 프로젝트의 이슈 조회 시 권한 확인
      const project = await prisma.project.findUnique({
        where: { id: projectId as string },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const isOwner = project.ownerId === userId;
      let isMember = false;

      if (!isOwner) {
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: projectId as string,
              userId,
            },
          },
        });
        isMember = !!member;
      }

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'You do not have permission to access this project' });
      }

      where.projectId = projectId as string;
    } else {
      // 모든 프로젝트의 이슈 조회 시 소유한 프로젝트 또는 멤버로 참여한 프로젝트만
      where.project = {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      };
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId as string;
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      where.OR = [
        {
          title: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ issues });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 이슈 상세 조회
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 이슈 조회
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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
            projectId: issue.projectId,
            userId,
          },
        },
      });
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to access this issue' });
    }

    // 권한이 있으면 전체 정보 조회
    const issueWithDetails = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true,
                name: true,
              },
            },
            attachments: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                size: true,
                mimeType: true,
                createdAt: true,
                uploadedBy: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            size: true,
            mimeType: true,
            createdAt: true,
            uploadedBy: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({ issue: issueWithDetails });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 이슈 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, description, projectId, status, priority, assigneeId, labelIds } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 이슈 생성
    const issue = await prisma.issue.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || 'OPEN',
        priority: priority || 'MEDIUM',
        projectId,
        authorId: userId,
        assigneeId: assigneeId || null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
      },
    });

    // 라벨 연결
    if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
      await prisma.issueLabel.createMany({
        data: labelIds.map((labelId: string) => ({
          issueId: issue.id,
          labelId,
        })),
        skipDuplicates: true,
      });

      // 라벨 정보 다시 조회
      const updatedIssue = await prisma.issue.findUnique({
        where: { id: issue.id },
        include: {
          labels: {
            include: {
              label: true,
            },
          },
        },
      });

      if (updatedIssue) {
        Object.assign(issue, { labels: updatedIssue.labels });
      }

      // 라벨 추가 활동 로그
      for (const labelId of labelIds) {
        const label = await prisma.label.findUnique({ where: { id: labelId } });
        if (label) {
          await createActivity({
            type: 'ISSUE_LABEL_ADDED',
            userId,
            projectId,
            issueId: issue.id,
            metadata: { labelId: label.id, labelName: label.name },
          });
        }
      }
    }

    // 이슈 생성 활동 로그
    await createActivity({
      type: 'ISSUE_CREATED',
      userId,
      projectId,
      issueId: issue.id,
      metadata: { title: issue.title },
    });

    // 알림: 담당자에게 새 이슈 배정 알림
    if (issue.assigneeId && issue.assigneeId !== userId) {
      await createNotification({
        userId: issue.assigneeId,
        type: 'ISSUE_ASSIGNED',
        title: `이슈가 배정되었습니다: ${issue.title}`,
        body: `프로젝트: ${issue.project.name}`,
        link: `/projects/${projectId}/issues/${issue.id}`,
      });
    }

    // SSE: 프로젝트 멤버에게 이슈 생성 이벤트 브로드캐스트
    const members = await getProjectUserIds(projectId);
    members.delete(userId); // 작성자 제외
    broadcastToUsers(members, {
      type: 'issue_created',
      payload: {
        projectId,
        issue: issue,
      },
    });

    res.status(201).json({
      message: 'Issue created successfully',
      issue,
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 이슈 수정
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, labelIds } = req.body;

    // 이슈 조회
    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!existingIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // 프로젝트 접근 권한 확인 (소유자 또는 멤버)
    const isOwner = existingIssue.project.ownerId === userId;
    let isMember = false;

    if (!isOwner) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existingIssue.project.id,
            userId,
          },
        },
      });
      isMember = !!member;
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have permission to update this issue' });
    }

    // 변경 사항 추적
    const changes: any = {};
    if (title && title.trim() !== existingIssue.title) {
      changes.title = { from: existingIssue.title, to: title.trim() };
    }
    if (description !== undefined && description?.trim() !== existingIssue.description) {
      changes.description = { from: existingIssue.description, to: description?.trim() || null };
    }
    if (status && status !== existingIssue.status) {
      changes.status = { from: existingIssue.status, to: status };
    }
    if (priority && priority !== existingIssue.priority) {
      changes.priority = { from: existingIssue.priority, to: priority };
    }
    if (assigneeId !== undefined && assigneeId !== existingIssue.assigneeId) {
      changes.assigneeId = { from: existingIssue.assigneeId, to: assigneeId || null };
    }

    // 라벨 업데이트
    if (labelIds !== undefined) {
      const existingLabels = await prisma.issueLabel.findMany({
        where: { issueId: id },
        include: { label: true },
      });
      const existingLabelIds = existingLabels.map((il) => il.labelId);
      const newLabelIds = labelIds as string[];
      const addedLabels = newLabelIds.filter((id) => !existingLabelIds.includes(id));
      const removedLabels = existingLabelIds.filter((id) => !newLabelIds.includes(id));

      // 기존 라벨 삭제
      await prisma.issueLabel.deleteMany({
        where: { issueId: id },
      });

      // 새 라벨 추가
      if (labelIds.length > 0) {
        await prisma.issueLabel.createMany({
          data: labelIds.map((labelId: string) => ({
            issueId: id,
            labelId,
          })),
        });
      }

      // 라벨 추가 활동 로그
      for (const labelId of addedLabels) {
        const label = await prisma.label.findUnique({ where: { id: labelId } });
        if (label) {
          await createActivity({
            type: 'ISSUE_LABEL_ADDED',
            userId,
            projectId: existingIssue.project.id,
            issueId: id,
            metadata: { labelId: label.id, labelName: label.name },
          });
        }
      }

      // 라벨 삭제 활동 로그
      for (const labelId of removedLabels) {
        const label = existingLabels.find((il) => il.labelId === labelId)?.label;
        if (label) {
          await createActivity({
            type: 'ISSUE_LABEL_REMOVED',
            userId,
            projectId: existingIssue.project.id,
            issueId: id,
            metadata: { labelId: label.id, labelName: label.name },
          });
        }
      }
    }

    // 이슈 업데이트
    const issue = await prisma.issue.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
      },
    });

    // 활동 로그 생성
    if (changes.status) {
      await createActivity({
        type: 'ISSUE_STATUS_CHANGED',
        userId,
        projectId: existingIssue.project.id,
        issueId: id,
        metadata: changes.status,
      });
    }

    if (changes.assigneeId) {
      await createActivity({
        type: 'ISSUE_ASSIGNEE_CHANGED',
        userId,
        projectId: existingIssue.project.id,
        issueId: id,
        metadata: changes.assigneeId,
      });
    }

    if (Object.keys(changes).length > 0 && !changes.status && !changes.assigneeId) {
      await createActivity({
        type: 'ISSUE_UPDATED',
        userId,
        projectId: existingIssue.project.id,
        issueId: id,
        metadata: changes,
      });
    }

    // 알림: 담당자 변경 → 새 담당자에게
    if (changes.assigneeId && changes.assigneeId.to) {
      const newAssigneeId = changes.assigneeId.to as string | null;
      if (newAssigneeId && newAssigneeId !== userId) {
        await createNotification({
          userId: newAssigneeId,
          type: 'ISSUE_ASSIGNED',
          title: `이슈가 배정되었습니다: ${issue.title}`,
          body: `프로젝트: ${issue.project.name}`,
          link: `/projects/${issue.project.id}/issues/${id}`,
        });
      }
    }

    // 알림: 상태 변경 → 작성자/담당자에게 (수행자 제외)
    if (changes.status) {
      const targets = new Set<string>();
      if (issue.authorId) targets.add(issue.authorId);
      if (issue.assigneeId) targets.add(issue.assigneeId);
      targets.delete(userId);

      for (const targetId of targets) {
        await createNotification({
          userId: targetId,
          type: 'ISSUE_STATUS_CHANGED',
          title: `이슈 상태 변경: ${issue.title}`,
          body: `새 상태: ${issue.status}`,
          link: `/projects/${issue.project.id}/issues/${id}`,
        });
      }
    }

    // SSE: 프로젝트 멤버에게 상태/배정/업데이트 브로드캐스트
    const members = await getProjectUserIds(existingIssue.project.id);
    members.delete(userId); // 수행자 제외
    broadcastToUsers(members, {
      type: 'issue_updated',
      payload: {
        projectId: existingIssue.project.id,
        issueId: id,
        issue,
        changes,
      },
    });

    res.json({
      message: 'Issue updated successfully',
      issue,
    });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 이슈 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 이슈가 사용자의 프로젝트에 속하는지 확인
    const issue = await prisma.issue.findFirst({
      where: {
        id,
        project: {
          ownerId: userId,
        },
      },
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // 삭제 전 활동 로그 생성
    await createActivity({
      type: 'ISSUE_DELETED',
      userId,
      projectId: issue.projectId,
      issueId: id,
      metadata: { title: issue.title },
    });

    await prisma.issue.delete({
      where: { id },
    });

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

