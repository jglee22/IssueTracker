import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { NotificationBell } from '../components/NotificationBell';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    issues: number;
  };
  statusData?: {
    OPEN: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
  resolutionRate?: number;
  lastUpdate?: string;
  recentActivity?: {
    type: string;
    createdAt: string;
    user: {
      username: string;
    };
  };
}

interface Statistics {
  totalProjects: number;
  totalIssues: number;
  inProgressIssues: number;
  resolutionRate: number;
}

export const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();

  const { data: projects, isLoading } = useQuery<{ projects: Project[] }>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    },
  });

  const { data: statistics } = useQuery<Statistics>({
    queryKey: ['statistics'],
    queryFn: async () => {
      const response = await api.get('/projects/statistics');
      return response.data;
    },
  });

  const getActivityMessage = (activity?: Project['recentActivity']): string => {
    if (!activity) return '';
    const userName = activity.user.username;
    const activityType = activity.type;
    
    const typeMap: Record<string, string> = {
      'ISSUE_CREATED': '이슈 생성',
      'ISSUE_UPDATED': '이슈 수정',
      'COMMENT_CREATED': '댓글 작성',
      'PROJECT_UPDATED': '프로젝트 수정',
    };
    
    return `${userName}님이 ${typeMap[activityType] || '활동'}함`;
  };

  const getStatusBar = (statusData?: Project['statusData']): string => {
    if (!statusData) return '○○○○○';
    const total = statusData.OPEN + statusData.IN_PROGRESS + statusData.RESOLVED + statusData.CLOSED;
    if (total === 0) return '○○○○○';
    
    const filled = Math.min(5, Math.ceil((statusData.IN_PROGRESS / total) * 5));
    return '●'.repeat(filled) + '○'.repeat(5 - filled);
  };

  const getCardBorderColor = (project: Project): string => {
    const hasInProgress = (project.statusData?.IN_PROGRESS || 0) > 0;
    const highResolutionRate = (project.resolutionRate || 0) >= 80;
    
    if (hasInProgress) return 'border-l-4 border-yellow-500';
    if (highResolutionRate) return 'border-l-4 border-green-500';
    return 'border-l-4 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Issue Tracker</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            {isAdmin && (
              <Link
                to="/admin/users"
                className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
              >
                관리자
              </Link>
            )}
            <span className="text-sm text-gray-700">
              {user?.username} ({user?.email})
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 요약 카드 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">전체 프로젝트</h3>
              <p className="text-3xl font-bold text-gray-900">{statistics.totalProjects}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">전체 이슈</h3>
              <p className="text-3xl font-bold text-gray-900">{statistics.totalIssues}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">진행 중 이슈</h3>
              <p className="text-3xl font-bold text-yellow-600">{statistics.inProgressIssues}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">해결률</h3>
              <p className="text-3xl font-bold text-green-600">{statistics.resolutionRate}%</p>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">프로젝트</h2>
          <div className="flex gap-2">
            <Link
              to="/labels"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              라벨 관리
            </Link>
            <Link
              to="/projects/new"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              새 프로젝트
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : projects?.projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">프로젝트가 없습니다.</p>
            <Link
              to="/projects/new"
              className="text-indigo-600 hover:text-indigo-700"
            >
              첫 프로젝트를 만들어보세요
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${getCardBorderColor(project)}`}
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}
                
                {/* 상태별 이슈 미니 바 */}
                {project.statusData && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">진행도:</span>
                    <span 
                      className="text-sm font-mono" 
                      title={`진행 중: ${project.statusData.IN_PROGRESS}개, 전체: ${project.statusData.OPEN + project.statusData.IN_PROGRESS + project.statusData.RESOLVED + project.statusData.CLOSED}개`}
                    >
                      {getStatusBar(project.statusData)}
                    </span>
                  </div>
                )}

                {/* 최근 활동 */}
                {project.recentActivity && (
                  <div className="mb-3 text-xs text-gray-500 line-clamp-1">
                    {getActivityMessage(project.recentActivity)}
                  </div>
                )}

                <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
                  <span className="text-gray-500">{project._count.issues}개의 이슈</span>
                  {project.lastUpdate && (
                    <span className="text-indigo-600 font-semibold text-xs">
                      {new Date(project.lastUpdate).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

