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
  _count: {
    issues: number;
  };
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
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-gray-600 mb-4">{project.description}</p>
                )}
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{project._count.issues}개의 이슈</span>
                  <span>
                    {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

