import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Avatar } from './Avatar';

interface Issue {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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

interface KanbanBoardProps {
  issues: Issue[];
  projectId: string;
  canEdit: boolean;
}

const statusColumns = [
  { id: 'OPEN', title: '열림', color: 'bg-blue-50 border-blue-200' },
  { id: 'IN_PROGRESS', title: '진행 중', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'RESOLVED', title: '해결됨', color: 'bg-green-50 border-green-200' },
  { id: 'CLOSED', title: '닫힘', color: 'bg-gray-50 border-gray-200' },
];

const priorityColors = {
  LOW: 'text-gray-600',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

interface DroppableColumnProps {
  id: string;
  title: string;
  color: string;
  children: React.ReactNode;
  issueCount: number;
}

function DroppableColumn({ id, title, color, children, issueCount }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${color} rounded-lg border-2 p-4 min-h-[500px] transition-colors ${
        isOver ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
      }`}
      data-column-id={id}
      data-droppable-id={id}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
          {issueCount}
        </span>
      </div>
      {children}
    </div>
  );
}

interface SortableIssueCardProps {
  issue: Issue;
  projectId: string;
  canEdit: boolean;
}

function SortableIssueCard({ issue, projectId, canEdit }: SortableIssueCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = () => {
    // 드래그 중이 아닐 때만 클릭 처리
    if (!isDragging) {
      navigate(`/projects/${projectId}/issues/${issue.id}`);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg shadow p-4 mb-3 hover:shadow-md transition-shadow ${
        !canEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-move'
      }`}
      onClick={handleCardClick}
    >
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-indigo-600">
        {issue.title}
      </h3>
      {issue.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{issue.description}</p>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium ${priorityColors[issue.priority]}`}>
          {issue.priority}
        </span>
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {issue.labels.map((issueLabel) => (
              <span
                key={issueLabel.id}
                className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: issueLabel.label.color }}
              >
                {issueLabel.label.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {issue.assignee ? (
            <div className="flex items-center gap-1">
              <Avatar user={issue.assignee} size="sm" />
              <span className="text-xs text-gray-600">{issue.assignee.name || issue.assignee.username}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">담당자 없음</span>
          )}
        </div>
        {issue._count.comments > 0 && (
          <span className="text-xs text-gray-500">💬 {issue._count.comments}</span>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ issues, projectId, canEdit }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동해야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 이슈를 상태별로 그룹화
  const issuesByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = issues.filter((issue) => issue.status === column.id);
    return acc;
  }, {} as Record<string, Issue[]>);

  const updateIssueStatus = useMutation({
    mutationFn: async ({ issueId, newStatus }: { issueId: string; newStatus: string }) => {
      const response = await api.put(`/issues/${issueId}`, { status: newStatus });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // 이슈 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
      // 활동 로그 갱신 (프로젝트 및 이슈 활동 로그 모두)
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activities', projectId, variables.issueId] });
      const statusLabels: Record<string, string> = {
        OPEN: '열림',
        IN_PROGRESS: '진행 중',
        RESOLVED: '해결됨',
        CLOSED: '닫힘',
      };
      toast.success(`이슈 상태가 "${statusLabels[variables.newStatus] || variables.newStatus}"로 변경되었습니다.`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '이슈 상태 변경에 실패했습니다.');
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // 현재 드래그 오버 중인 대상 추적
    if (event.over) {
      setOverId(event.over.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || !canEdit) {
      return;
    }

    const issueId = active.id as string;
    let targetStatus: string | null = null;

    // over.id가 컬럼 ID인지 확인
    const isValidColumn = statusColumns.some((col) => col.id === over.id);
    if (isValidColumn) {
      targetStatus = over.id as string;
    } else {
      // over.id가 이슈 ID인 경우, 해당 이슈의 상태를 가져옴
      const targetIssue = issues.find((i) => i.id === over.id);
      if (targetIssue) {
        targetStatus = targetIssue.status;
      } else {
        // over.id가 SortableContext 내부의 div인 경우, 부모 컬럼 찾기
        // 모든 컬럼을 확인하여 over.id를 포함하는 컬럼 찾기
        const allColumnElements = document.querySelectorAll('[data-column-id]');
        for (const columnElement of allColumnElements) {
          const columnId = columnElement.getAttribute('data-column-id');
          // 컬럼 내부의 모든 요소 확인
          const container = columnElement.querySelector(`[data-droppable-id="${over.id}"]`);
          if (container || columnElement.querySelector(`[data-sortable-container="${over.id}"]`)) {
            if (columnId && statusColumns.some((col) => col.id === columnId)) {
              targetStatus = columnId;
              break;
            }
          }
        }
        
        // 여전히 찾지 못한 경우, overId를 사용 (handleDragOver에서 추적)
        if (!targetStatus && overId) {
          const overIdIsColumn = statusColumns.some((col) => col.id === overId);
          if (overIdIsColumn) {
            targetStatus = overId;
          } else {
            const overIdIssue = issues.find((i) => i.id === overId);
            if (overIdIssue) {
              targetStatus = overIdIssue.status;
            }
          }
        }
      }
    }

    if (!targetStatus) {
      return;
    }

    // 같은 컬럼에 드롭한 경우 무시
    const currentIssue = issues.find((i) => i.id === issueId);
    if (currentIssue && currentIssue.status === targetStatus) {
      return;
    }

    // 이슈 상태 업데이트
    updateIssueStatus.mutate({ issueId, newStatus: targetStatus });
  };

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusColumns.map((column) => {
          const columnIssues = issuesByStatus[column.id] || [];
          return (
            <DroppableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              issueCount={columnIssues.length}
            >
              <SortableContext
                items={columnIssues.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div data-droppable-id={column.id} data-sortable-container={column.id}>
                  {columnIssues.map((issue) => (
                    <SortableIssueCard
                      key={issue.id}
                      issue={issue}
                      projectId={projectId}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeIssue ? (
          <div className="bg-white rounded-lg shadow-lg p-4 w-64">
            <h3 className="font-semibold text-gray-900 mb-2">{activeIssue.title}</h3>
            {activeIssue.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{activeIssue.description}</p>
            )}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${priorityColors[activeIssue.priority]}`}>
                {activeIssue.priority}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

