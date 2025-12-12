import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationBell } from '../components/NotificationBell';

type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';
type UserRole = 'ADMIN' | 'MEMBER';

interface UserRow {
  id: string;
  email: string;
  username: string;
  name?: string;
  status: UserStatus;
  role: UserRole;
  rejectionReason?: string | null;
  createdAt: string;
}

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ users: UserRow[] }>({
    queryKey: ['adminUsers', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await api.get(`/admin/users${params}`);
      return response.data;
    },
  });

  const approveUser = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const response = await api.post(`/admin/users/${userId}/approve`, {
        role: makeAdmin ? 'ADMIN' : 'MEMBER',
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success(variables.makeAdmin ? '관리자로 승인되었습니다.' : '사용자가 승인되었습니다.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '승인에 실패했습니다.');
    },
  });

  const rejectUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const response = await api.post(`/admin/users/${userId}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('사용자가 거절되었습니다.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '거절에 실패했습니다.');
    },
  });

  const handleApprove = (userId: string, currentRole: UserRole) => {
    const makeAdmin = window.confirm('관리자로 승인하시겠습니까? (확인: 관리자 / 취소: 일반 사용자)');
    approveUser.mutate({ userId, makeAdmin });
  };

  const handleReject = (userId: string) => {
    const reason = window.prompt('거절 사유를 입력하세요 (선택 사항)');
    rejectUser.mutate({ userId, reason: reason || undefined });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">관리자 - 사용자 승인</h1>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <NotificationBell />
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ← 뒤로
            </button>
            <Link
              to="/"
              className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              대시보드
            </Link>
            <span>
              {currentUser?.username} ({currentUser?.email})
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">상태 필터</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">전체</option>
              <option value="PENDING">대기</option>
              <option value="ACTIVE">활성</option>
              <option value="REJECTED">거절</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            승인/거절 시 해당 계정의 상태가 즉시 반영됩니다.
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청일</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : data?.users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      표시할 사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data?.users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{u.username}</span>
                          <span className="text-sm text-gray-500">{u.email}</span>
                          {u.name && <span className="text-sm text-gray-500">{u.name}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.status === 'PENDING' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">대기</span>
                        )}
                        {u.status === 'ACTIVE' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">활성</span>
                        )}
                        {u.status === 'REJECTED' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">거절</span>
                        )}
                        {u.status === 'REJECTED' && u.rejectionReason && (
                          <div className="text-xs text-gray-500 mt-1">사유: {u.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{u.role === 'ADMIN' ? '관리자' : '일반'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {u.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleApprove(u.id, u.role)}
                              disabled={approveUser.isLoading}
                              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                              승인
                            </button>
                          )}
                          {u.status !== 'REJECTED' && currentUser?.id !== u.id && (
                            <button
                              onClick={() => handleReject(u.id)}
                              disabled={rejectUser.isLoading}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              거절
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

