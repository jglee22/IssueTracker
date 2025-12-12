import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { KanbanBoard } from '../components/KanbanBoard';
import { ActivityLog } from '../components/ActivityLog';
import { ProjectDashboard } from '../components/ProjectDashboard';

interface Issue {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  author: {
    id: string;
    username: string;
  };
  assignee?: {
    id: string;
    username: string;
  };
  labels?: Array<{
    id: string;
    label: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  createdAt: string;
  _count: {
    comments: number;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
}

interface ProjectResponse {
  project: Project;
  userRole?: 'OWNER' | 'MEMBER' | 'VIEWER';
}

interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
}

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  LOW: 'text-gray-600',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [appliedSearchText, setAppliedSearchText] = useState<string>('');
  
  // localStorage에서 뷰 모드 복원
  const getInitialViewMode = (): 'dashboard' | 'list' | 'kanban' => {
    const saved = localStorage.getItem(`projectViewMode_${id}`);
    return (saved === 'dashboard' || saved === 'list' || saved === 'kanban') ? saved : 'dashboard';
  };
  
  const [viewMode, setViewMode] = useState<'dashboard' | 'list' | 'kanban'>(getInitialViewMode);
  
  // 뷰 모드 변경 시 localStorage에 저장
  const handleViewModeChange = (mode: 'dashboard' | 'list' | 'kanban') => {
    setViewMode(mode);
    if (id) {
      localStorage.setItem(`projectViewMode_${id}`, mode);
    }
  };

  const { data: projectData, isLoading: projectLoading, error: projectError } = useQuery<ProjectResponse>({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    },
    retry: false,
  });

  const project = projectData?.project;
  const userRole = projectData?.userRole || 'VIEWER';
  const isOwner = userRole === 'OWNER';
  const canEdit = userRole === 'OWNER' || userRole === 'MEMBER';

  const issuesQueryKey = useMemo(
    () => ['issues', id, statusFilter, priorityFilter, assigneeFilter, appliedSearchText],
    [id, statusFilter, priorityFilter, assigneeFilter, appliedSearchText]
  );

  const { data: issues, isLoading } = useQuery<{ issues: Issue[] }>({
    queryKey: issuesQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (id) params.append('projectId', id);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (assigneeFilter) {
        if (assigneeFilter === '__unassigned__') {
          params.append('assigneeId', '');
        } else {
          params.append('assigneeId', assigneeFilter);
        }
      }
      if (appliedSearchText.trim()) params.append('q', appliedSearchText.trim());

      const response = await api.get(`/issues?${params.toString()}`);
      return response.data;
    },
    enabled: !!project, // 프로젝트가 로드된 후에만 실행
    retry: false,
  });

  // 프로젝트 멤버 목록 (담당자 필터용)
  const { data: membersData } = useQuery<{ members: Array<{ userId: string; user: User }> }>({
    queryKey: ['projectMembers', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/projects/${id}/members`);
        return response.data;
      } catch (error) {
        // 멤버 조회 실패 시 빈 배열 반환 (에러 무시)
        return { members: [] };
      }
    },
    enabled: !!project,
  });

  const handleSearch = () => {
    setAppliedSearchText(searchText.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (issueId: string) => {
      await api.delete(`/issues/${issueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      // 활동 로그 갱신
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['activities', id] });
      }
      toast.success('이슈가 삭제되었습니다.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '이슈 삭제에 실패했습니다.');
    },
  });

  const handleDelete = async (issueId: string) => {
    if (window.confirm('이 이슈를 삭제하시겠습니까?')) {
      deleteMutation.mutate(issueId);
    }
  };

  if (projectLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (projectError) {
    const errorMessage = (projectError as any)?.response?.data?.error || '프로젝트를 불러올 수 없습니다.';
    const statusCode = (projectError as any)?.response?.status;
    
    // 404 에러인 경우 대시보드로 자동 리다이렉트
    if (statusCode === 404) {
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2 text-lg font-medium">
            {statusCode === 404 ? '프로젝트를 찾을 수 없습니다.' : errorMessage}
          </p>
          {statusCode === 404 && (
            <p className="text-gray-500 text-sm mb-4">
              데이터베이스가 리셋되었거나 해당 프로젝트가 삭제되었을 수 있습니다.
              <br />
              2초 후 대시보드로 이동합니다...
            </p>
          )}
          {statusCode === 403 && (
            <p className="text-gray-500 text-sm mb-4">
              이 프로젝트에 대한 접근 권한이 없습니다.
            </p>
          )}
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-700 mb-2 inline-block"
          >
            ← 프로젝트 목록
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project?.name}
              </h1>
              {project?.description && (
                <p className="text-gray-600 mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/projects/${id}/members`)}
                disabled={!isOwner}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isOwner ? '멤버 관리는 소유자만 가능합니다.' : ''}
              >
                멤버 관리
              </button>
              <button
                onClick={() => navigate(`/projects/${id}/edit`)}
                disabled={!isOwner}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isOwner ? '프로젝트 수정은 소유자만 가능합니다.' : ''}
              >
                프로젝트 수정
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      '이 프로젝트를 삭제하시겠습니까? 프로젝트에 속한 모든 이슈와 댓글도 함께 삭제됩니다.'
                    )
                  ) {
                    api
                      .delete(`/projects/${id}`)
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ['projects'] });
                        toast.success('프로젝트가 삭제되었습니다.');
                        navigate('/');
                      })
                      .catch((err) => {
                        const errorMessage = err.response?.data?.error || '프로젝트 삭제에 실패했습니다.';
                        toast.error(errorMessage);
                      });
                  }
                }}
                disabled={!isOwner}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isOwner ? '프로젝트 삭제는 소유자만 가능합니다.' : ''}
              >
                프로젝트 삭제
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">이슈</h2>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => handleViewModeChange('dashboard')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'dashboard'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                대시보드
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                리스트
              </button>
              <button
                onClick={() => handleViewModeChange('kanban')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                칸반
              </button>
            </div>
            <button
              onClick={() => navigate(`/projects/${id}/issues/new`)}
              disabled={!canEdit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canEdit ? '이슈를 생성할 권한이 없습니다.' : ''}
            >
              새 이슈
            </button>
          </div>
        </div>

        {/* 대시보드 뷰 */}
        {viewMode === 'dashboard' && user && (
          <ProjectDashboard projectId={id!} userId={user.id} />
        )}

        {/* 필터 영역 (리스트 뷰에서만 표시) */}
        {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태 필터
              </label>
              <select
                className="w-44 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">전체</option>
                <option value="OPEN">열림</option>
                <option value="IN_PROGRESS">진행 중</option>
                <option value="RESOLVED">해결됨</option>
                <option value="CLOSED">닫힘</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                우선순위 필터
              </label>
              <select
                className="w-44 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">전체</option>
                <option value="LOW">낮음</option>
                <option value="MEDIUM">보통</option>
                <option value="HIGH">높음</option>
                <option value="URGENT">긴급</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                담당자 필터
              </label>
              <select
                className="w-52 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="">전체</option>
                <option value="__unassigned__">(미지정)</option>
                {membersData?.members?.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name || member.user.username} ({member.user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목/내용 검색
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="검색어를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  aria-label="검색"
                >
                  🔍
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {viewMode !== 'dashboard' && (
          <>
            {issues?.issues.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 mb-4">이슈가 없습니다.</p>
                <button
                  onClick={() => navigate(`/projects/${id}/issues/new`)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  첫 이슈를 만들어보세요
                </button>
              </div>
            ) : viewMode === 'kanban' ? (
              <KanbanBoard issues={issues.issues} projectId={id!} canEdit={canEdit} />
            ) : (
              <div className="space-y-4">
                {issues?.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link
                          to={`/projects/${id}/issues/${issue.id}`}
                          className="text-xl font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {issue.title}
                        </Link>
                        {issue.description && (
                          <p className="text-gray-600 mt-2 line-clamp-2">
                            {issue.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              statusColors[issue.status]
                            }`}
                          >
                            {issue.status}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              priorityColors[issue.priority]
                            }`}
                          >
                            {issue.priority}
                          </span>
                          <span className="text-sm text-gray-500">
                            작성자: {issue.author.username}
                          </span>
                          {issue.assignee && (
                            <span className="text-sm text-gray-500">
                              담당자: {issue.assignee.username}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            댓글 {issue._count.comments}개
                          </span>
                          {issue.labels && issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {issue.labels.map((issueLabel) => (
                                <span
                                  key={issueLabel.id}
                                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                  style={{ backgroundColor: issueLabel.label.color }}
                                >
                                  {issueLabel.label.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate(`/projects/${id}/issues/${issue.id}/edit`)
                          }
                          disabled={!canEdit}
                          className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!canEdit ? '이슈를 수정할 권한이 없습니다.' : ''}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(issue.id)}
                          disabled={!canEdit}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!canEdit ? '이슈를 삭제할 권한이 없습니다.' : ''}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 최근 활동 섹션 (대시보드 뷰가 아닐 때만 표시) */}
        {viewMode !== 'dashboard' && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">최근 활동</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <ActivityLog projectId={id} limit={20} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

