import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { createActivity } from '../utils/activity';
import { createNotification } from '../utils/notification';
import { sendEvent } from '../utils/realtime';

const router = Router();

// 댓글 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { content, issueId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!issueId) {
      return res.status(400).json({ error: 'Issue ID is required' });
    }

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

    // 프로젝트 접근 권한 확인 (소유자 또는 멤버)
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
      return res.status(403).json({ error: 'You do not have permission to comment on this issue' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        issueId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // 댓글 생성 활동 로그
    await createActivity({
      type: 'COMMENT_CREATED',
      userId,
      projectId: issue.project.id,
      issueId,
      metadata: { commentId: comment.id },
    });

    // 알림: 이슈 작성자/담당자에게 (작성자 제외)
    const targets = new Set<string>();
    if (issue.authorId) targets.add(issue.authorId);
    if (issue.assigneeId) targets.add(issue.assigneeId);
    targets.delete(userId);

    for (const targetId of targets) {
      await createNotification({
        userId: targetId,
        type: 'ISSUE_COMMENTED',
        title: `댓글이 추가되었습니다: ${issue.title}`,
        body: comment.content,
        link: `/projects/${issue.project.id}/issues/${issueId}`,
      });
    }

    // SSE: 프로젝트 멤버에게 댓글 추가 브로드캐스트
    const members = await prisma.projectMember.findMany({
      where: { projectId: issue.project.id },
      select: { userId: true },
    });
    const memberIds = new Set<string>(members.map((m) => m.userId));
    memberIds.add(issue.project.ownerId);
    memberIds.delete(userId); // 작성자 제외

    for (const uid of memberIds) {
      sendEvent(uid, {
        type: 'issue_commented',
        payload: {
          projectId: issue.project.id,
          issueId,
          comment: {
            id: comment.id,
            content: comment.content,
            authorId: userId,
          },
        },
      });
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 댓글 수정
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // 댓글 조회 및 권한 확인
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            project: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // 댓글 작성자 또는 프로젝트 소유자만 수정 가능
    const isCommentAuthor = existingComment.authorId === userId;
    const isProjectOwner = existingComment.issue.project.ownerId === userId;

    if (!isCommentAuthor && !isProjectOwner) {
      return res.status(403).json({ error: 'You do not have permission to edit this comment' });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'Comment updated successfully',
      comment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 댓글 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 댓글 조회 및 권한 확인
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            project: {
              select: {
                id: true,
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // 댓글 소유자 또는 프로젝트 소유자만 삭제 가능
    const isCommentAuthor = comment.authorId === userId;
    const isProjectOwner = comment.issue.project.ownerId === userId;

    if (!isCommentAuthor && !isProjectOwner) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    // 댓글 삭제 활동 로그
    await createActivity({
      type: 'COMMENT_DELETED',
      userId,
      projectId: comment.issue.project.id,
      issueId: comment.issueId,
      metadata: { commentId: comment.id },
    });

    await prisma.comment.delete({
      where: { id },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

