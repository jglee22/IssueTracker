import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Avatar } from './Avatar';

interface Activity {
  id: string;
  type: string;
  userId: string;
  projectId?: string;
  issueId?: string;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    name?: string;
  };
  issue?: {
    id: string;
    title: string;
  };
}

interface ActivityLogProps {
  projectId?: string;
  issueId?: string;
  limit?: number;
}

const getActivityMessage = (activity: Activity): string => {
  const userName = activity.user.name || activity.user.username;
  const metadata = activity.metadata || {};

  switch (activity.type) {
    case 'ISSUE_CREATED':
      return `${userName}님이 이슈를 생성했습니다`;
    case 'ISSUE_UPDATED':
      return `${userName}님이 이슈를 수정했습니다`;
    case 'ISSUE_DELETED':
      return `${userName}님이 이슈를 삭제했습니다`;
    case 'ISSUE_STATUS_CHANGED':
      const statusMap: Record<string, string> = {
        OPEN: '열림',
        IN_PROGRESS: '진행 중',
        RESOLVED: '해결됨',
        CLOSED: '닫힘',
      };
      const fromStatus = statusMap[metadata.from] || metadata.from;
      const toStatus = statusMap[metadata.to] || metadata.to;
      return `${userName}님이 상태를 ${fromStatus}에서 ${toStatus}로 변경했습니다`;
    case 'ISSUE_ASSIGNEE_CHANGED':
      if (metadata.from && metadata.to) {
        return `${userName}님이 담당자를 변경했습니다`;
      } else if (metadata.to) {
        return `${userName}님이 담당자를 지정했습니다`;
      } else {
        return `${userName}님이 담당자를 해제했습니다`;
      }
    case 'ISSUE_LABEL_ADDED':
      return `${userName}님이 라벨 "${metadata.labelName}"을(를) 추가했습니다`;
    case 'ISSUE_LABEL_REMOVED':
      return `${userName}님이 라벨 "${metadata.labelName}"을(를) 제거했습니다`;
    case 'COMMENT_CREATED':
      return `${userName}님이 댓글을 작성했습니다`;
    case 'COMMENT_DELETED':
      return `${userName}님이 댓글을 삭제했습니다`;
    case 'PROJECT_UPDATED':
      return `${userName}님이 프로젝트 정보를 수정했습니다`;
    case 'PROJECT_MEMBER_ADDED':
      return `${userName}님이 "${metadata.addedUserName}"님을 멤버로 추가했습니다`;
    case 'PROJECT_MEMBER_REMOVED':
      return `${userName}님이 "${metadata.removedUserName}"님을 멤버에서 제거했습니다`;
    case 'PROJECT_MEMBER_ROLE_CHANGED':
      const roleMap: Record<string, string> = {
        OWNER: '소유자',
        MEMBER: '멤버',
        VIEWER: '뷰어',
      };
      const fromRole = roleMap[metadata.from] || metadata.from;
      const toRole = roleMap[metadata.to] || metadata.to;
      return `${userName}님이 "${metadata.memberUserName}"님의 역할을 ${fromRole}에서 ${toRole}로 변경했습니다`;
    default:
      return `${userName}님이 활동했습니다`;
  }
};

export const ActivityLog = ({ projectId, issueId, limit = 50 }: ActivityLogProps) => {
  const endpoint = issueId
    ? `/issues/${issueId}/activities`
    : projectId
    ? `/projects/${projectId}/activities`
    : null;

  const { data, isLoading } = useQuery<{ activities: Activity[] }>({
    queryKey: ['activities', projectId, issueId],
    queryFn: async () => {
      if (!endpoint) throw new Error('No endpoint specified');
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: !!endpoint,
  });

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">활동 로그를 불러오는 중...</p>
      </div>
    );
  }

  if (!data || data.activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">활동 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <Avatar user={activity.user} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-900 font-medium">
                {activity.user.name || activity.user.username}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(activity.createdAt).toLocaleString('ko-KR')}
              </span>
            </div>
            <p className="text-sm text-gray-700">{getActivityMessage(activity)}</p>
            {activity.issue && activity.projectId && (
              <Link
                to={`/projects/${activity.projectId}/issues/${activity.issue.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 inline-block"
              >
                {activity.issue.title}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

