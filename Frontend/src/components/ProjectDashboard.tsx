import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import { Avatar } from './Avatar';

interface ProjectDashboardProps {
  projectId: string;
  userId: string;
}

const statusColors = {
  OPEN: '#3B82F6', // blue
  IN_PROGRESS: '#F59E0B', // yellow
  RESOLVED: '#10B981', // green
  CLOSED: '#6B7280', // gray
};

const priorityColors = {
  LOW: '#6B7280', // gray
  MEDIUM: '#3B82F6', // blue
  HIGH: '#F59E0B', // orange
  URGENT: '#EF4444', // red
};

interface Issue {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  updatedAt: string;
  author: {
    id: string;
    username: string;
    name?: string;
  };
  assignee?: {
    id: string;
    username: string;
    name?: string;
  };
}

interface StatisticsData {
  statusData: Array<{ name: string; value: number; status: string }>;
  priorityData: Array<{ name: string; value: number; priority: string }>;
  myIssuesCount: number;
  recentIssues: Issue[];
}

export const ProjectDashboard = ({ projectId }: ProjectDashboardProps) => {
  const { data, isLoading } = useQuery<StatisticsData>({
    queryKey: ['projectStatistics', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/statistics`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">통계를 불러오는 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">통계 데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 상태별 총 이슈 수 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 이슈</h3>
          <p className="text-2xl font-bold text-gray-900">
            {data.statusData.reduce((sum, item) => sum + item.value, 0)}
          </p>
        </div>

        {/* 나에게 할당된 이슈 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">나에게 할당된 이슈</h3>
          <p className="text-2xl font-bold text-indigo-600">{data.myIssuesCount}</p>
        </div>

        {/* 열림 상태 이슈 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">열림</h3>
          <p className="text-2xl font-bold text-blue-600">
            {data.statusData.find((s) => s.status === 'OPEN')?.value || 0}
          </p>
        </div>

        {/* 진행 중 이슈 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">진행 중</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {data.statusData.find((s) => s.status === 'IN_PROGRESS')?.value || 0}
          </p>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 상태별 이슈 개수 (파이 차트) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">상태별 이슈 개수</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.statusData.filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, value, percent }) => {
                  if (value === 0) return '';
                  const safePercent = percent ?? 0;
                  return `${name}\n${value}개 (${(safePercent * 100).toFixed(1)}%)`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.statusData.filter(item => item.value > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[entry.status as keyof typeof statusColors]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, _props: any) => {
                  const total = data.statusData.reduce((sum, item) => sum + item.value, 0);
                  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return [`${value}개 (${percent}%)`, name];
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: string) => {
                  const item = data.statusData.find(d => d.name === value);
                  if (!item || item.value === 0) return '';
                  const total = data.statusData.reduce((sum, d) => sum + d.value, 0);
                  const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                  return `${value}: ${item.value}개 (${percent}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 우선순위별 개수 (바 차트) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">우선순위별 이슈 개수</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={priorityColors[entry.priority as keyof typeof priorityColors]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 최근 업데이트된 이슈 리스트 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 업데이트된 이슈</h3>
        {data.recentIssues.length === 0 ? (
          <p className="text-gray-500 text-center py-8">최근 업데이트된 이슈가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {data.recentIssues.map((issue) => (
              <Link
                key={issue.id}
                to={`/projects/${projectId}/issues/${issue.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{issue.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          issue.status === 'OPEN'
                            ? 'bg-blue-100 text-blue-800'
                            : issue.status === 'IN_PROGRESS'
                            ? 'bg-yellow-100 text-yellow-800'
                            : issue.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {issue.status}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          issue.priority === 'LOW'
                            ? 'text-gray-600'
                            : issue.priority === 'MEDIUM'
                            ? 'text-blue-600'
                            : issue.priority === 'HIGH'
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}
                      >
                        {issue.priority}
                      </span>
                      {issue.assignee && (
                        <div className="flex items-center gap-1">
                          <Avatar user={issue.assignee} size="sm" />
                          <span className="text-xs">{issue.assignee.name || issue.assignee.username}</span>
                        </div>
                      )}
                      <span className="text-xs">
                        {new Date(issue.updatedAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

