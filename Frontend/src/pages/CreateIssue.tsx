import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export const CreateIssue = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN' as const,
    priority: 'MEDIUM' as const,
    assigneeId: '',
    labelIds: [] as string[],
  });
  const [error, setError] = useState('');

  // 프로젝트 정보 조회
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
  });

  // 프로젝트 멤버 목록 조회
  const { data: membersData } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/members`);
      return response.data;
    },
  });

  // 라벨 목록 조회
  const { data: labelsData } = useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const response = await api.get('/labels');
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/issues', {
        ...data,
        projectId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
      // 활동 로그 갱신
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      toast.success('이슈가 생성되었습니다.');
      // 파일이 있으면 파일 업로드 후 이동, 없으면 바로 이동
      navigate(`/projects/${projectId}/issues/${data.issue.id}`);
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.error || '이슈 생성에 실패했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      assigneeId: formData.assigneeId || undefined,
      labelIds: formData.labelIds.length > 0 ? formData.labelIds : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={`/projects/${projectId}`}
          className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
        >
          ← {project?.project.name || '프로젝트'}로 돌아가기
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">새 이슈</h1>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                제목 *
              </label>
              <input
                id="title"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                설명
              </label>
              <textarea
                id="description"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  상태
                </label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as any,
                    })
                  }
                >
                  <option value="OPEN">열림</option>
                  <option value="IN_PROGRESS">진행 중</option>
                  <option value="RESOLVED">해결됨</option>
                  <option value="CLOSED">닫힘</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  우선순위
                </label>
                <select
                  id="priority"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as any,
                    })
                  }
                >
                  <option value="LOW">낮음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="HIGH">높음</option>
                  <option value="URGENT">긴급</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="assignee"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                담당자
              </label>
              <select
                id="assignee"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.assigneeId}
                onChange={(e) =>
                  setFormData({ ...formData, assigneeId: e.target.value })
                }
              >
                <option value="">(미지정)</option>
                {membersData?.members?.map((member: any) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name || member.user.username} ({member.user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                라벨
              </label>
              <div className="flex flex-wrap gap-2">
                {labelsData?.labels?.map((label: any) => (
                  <label
                    key={label.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.labelIds.includes(label.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            labelIds: [...formData.labelIds, label.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            labelIds: formData.labelIds.filter(
                              (id) => id !== label.id
                            ),
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  </label>
                ))}
                {labelsData?.labels?.length === 0 && (
                  <p className="text-sm text-gray-500">라벨이 없습니다.</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {mutation.isPending ? '생성 중...' : '생성'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

