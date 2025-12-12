import prisma from '../lib/prisma';

export type ActivityType =
  | 'ISSUE_CREATED'
  | 'ISSUE_UPDATED'
  | 'ISSUE_DELETED'
  | 'ISSUE_STATUS_CHANGED'
  | 'ISSUE_ASSIGNEE_CHANGED'
  | 'ISSUE_LABEL_ADDED'
  | 'ISSUE_LABEL_REMOVED'
  | 'COMMENT_CREATED'
  | 'COMMENT_DELETED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_MEMBER_REMOVED'
  | 'PROJECT_MEMBER_ROLE_CHANGED';

interface CreateActivityParams {
  type: ActivityType;
  userId: string;
  projectId?: string;
  issueId?: string;
  metadata?: any;
}

export async function createActivity({
  type,
  userId,
  projectId,
  issueId,
  metadata,
}: CreateActivityParams) {
  try {
    await prisma.activity.create({
      data: {
        type,
        userId,
        projectId: projectId || null,
        issueId: issueId || null,
        metadata: metadata || null,
      },
    });
  } catch (error) {
    // 활동 로그 생성 실패는 앱 동작에 영향을 주지 않도록 조용히 처리
    console.error('Failed to create activity:', error);
  }
}

