import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=20');
      return response.data;
    },
    staleTime: 10_000,
  });

  const unreadCount = data?.notifications.filter((n) => !n.read).length || 0;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post(`/notifications/read-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
        aria-label="알림"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">알림</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-indigo-600 hover:text-indigo-700"
                disabled={markAllRead.isLoading || unreadCount === 0}
              >
                모두 읽음
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500">불러오는 중...</div>
            ) : data && data.notifications.length > 0 ? (
              data.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                    n.read ? 'bg-white' : 'bg-indigo-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{n.title}</div>
                      {n.body && <div className="text-sm text-gray-600 mt-1">{n.body}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString('ko-KR')}
                      </div>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 inline-block"
                          onClick={() => {
                            setOpen(false);
                            if (!n.read) markRead.mutate(n.id);
                          }}
                        >
                          바로가기
                        </Link>
                      )}
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                        disabled={markRead.isLoading}
                      >
                        읽음
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">새 알림이 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

