import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface Label {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export const LabelManagement = () => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
  });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<{ labels: Label[] }>({
    queryKey: ['labels'],
    queryFn: async () => {
      const response = await api.get('/labels');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await api.post('/labels', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      setShowCreateModal(false);
      setFormData({ name: '', color: '#3B82F6' });
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || '라벨 생성에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; color?: string } }) => {
      const response = await api.put(`/labels/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      setEditingLabel(null);
      setFormData({ name: '', color: '#3B82F6' });
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || '라벨 수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/labels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('라벨 이름을 입력하세요.');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('라벨 이름을 입력하세요.');
      return;
    }
    if (!editingLabel) return;
    updateMutation.mutate({
      id: editingLabel.id,
      data: formData,
    });
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color });
    setShowCreateModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('이 라벨을 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
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
          to="/"
          className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
        >
          ← 대시보드로 돌아가기
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">라벨 관리</h1>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setEditingLabel(null);
                setFormData({ name: '', color: '#3B82F6' });
                setError('');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              새 라벨
            </button>
          </div>

          {/* 라벨 목록 */}
          <div className="space-y-4">
            {data?.labels.length === 0 ? (
              <p className="text-gray-500 text-center py-8">라벨이 없습니다.</p>
            ) : (
              data?.labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="px-3 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {label.color}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(label)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingLabel ? '라벨 수정' : '새 라벨'}
              </h2>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              <form
                onSubmit={editingLabel ? handleUpdate : handleCreate}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    라벨 이름 *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    색상
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? '저장 중...'
                      : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingLabel(null);
                      setFormData({ name: '', color: '#3B82F6' });
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

