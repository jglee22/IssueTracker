import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Avatar } from '../components/Avatar';

interface ProjectMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
  };
}

interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
}

const roleLabels = {
  OWNER: '소유자',
  MEMBER: '멤버',
  VIEWER: '뷰어',
};

const roleColors = {
  OWNER: 'bg-purple-100 text-purple-800',
  MEMBER: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

export const ProjectMembers = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'MEMBER' | 'VIEWER'>('MEMBER');
  const [error, setError] = useState('');

  // 프로젝트 정보
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
  });

  // 프로젝트 멤버 목록
  const { data: membersData, isLoading } = useQuery<{ members: ProjectMember[] }>({
    queryKey: ['projectMembers', projectId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      const response = await api.get(
        `/projects/${projectId}/members${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    },
  });

  // 전체 사용자 목록 (멤버 추가용)
  const { data: allUsers } = useQuery<{ users: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: showAddModal,
  });

  // 이미 멤버인 사용자 필터링
  const availableUsers = allUsers?.users?.filter(
    (user) => !membersData?.members?.some((m) => m.userId === user.id)
  ) || [];

  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; role: 'MEMBER' | 'VIEWER' }) => {
      const response = await api.post(`/projects/${projectId}/members`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      setShowAddModal(false);
      setSelectedUserId('');
      setSelectedRole('MEMBER');
      setError('');
      toast.success('멤버가 추가되었습니다.');
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.error || '멤버 추가에 실패했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'MEMBER' | 'VIEWER' }) => {
      const response = await api.put(`/projects/${projectId}/members/${memberId}`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      toast.success('멤버 역할이 변경되었습니다.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '역할 변경에 실패했습니다.');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      toast.success('멤버가 제거되었습니다.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '멤버 제거에 실패했습니다.');
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUserId) {
      setError('사용자를 선택하세요.');
      return;
    }
    addMemberMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
    });
  };

  const handleRemoveMember = (memberId: string, username: string) => {
    if (window.confirm(`${username}님을 프로젝트에서 제거하시겠습니까?`)) {
      removeMemberMutation.mutate(memberId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={`/projects/${projectId}`}
          className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
        >
          ← {project?.project.name || '프로젝트'}로 돌아가기
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 멤버</h1>
            <button
              onClick={() => {
                setShowAddModal(true);
                setError('');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              멤버 추가
            </button>
          </div>

          {/* 검색 */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="멤버 검색 (이름, 이메일, 사용자명)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 멤버 목록 */}
          <div className="space-y-4">
            {membersData?.members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">멤버가 없습니다.</p>
            ) : (
              membersData?.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={member.user.name || member.user.username}
                      email={member.user.email}
                      size="md"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.user.name || member.user.username}
                      </div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        roleColors[member.role]
                      }`}
                    >
                      {roleLabels[member.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role !== 'OWNER' && (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => {
                            if (member.id !== 'owner') {
                              updateRoleMutation.mutate({
                                memberId: member.id,
                                role: e.target.value as 'MEMBER' | 'VIEWER',
                              });
                            }
                          }}
                          disabled={member.id === 'owner'}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="MEMBER">멤버</option>
                          <option value="VIEWER">뷰어</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user.username)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={member.id === 'owner'}
                        >
                          제거
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 멤버 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">멤버 추가</h2>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용자 선택 *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">사용자를 선택하세요</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      추가할 수 있는 사용자가 없습니다.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    역할 *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'MEMBER' | 'VIEWER')}
                  >
                    <option value="MEMBER">멤버</option>
                    <option value="VIEWER">뷰어</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={addMemberMutation.isPending || !selectedUserId}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addMemberMutation.isPending ? '추가 중...' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedUserId('');
                      setSelectedRole('MEMBER');
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

