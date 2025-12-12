import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ActivityLog } from '../components/ActivityLog';
import { FileAttachment, AttachmentList } from '../components/FileAttachment';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  attachments?: Array<{
    id: string;
    filename?: string;
    originalName?: string;
    size: number;
    mimeType: string;
    createdAt: string;
    uploadedBy?: {
      id: string;
      username: string;
      name?: string;
    };
  }>;
  createdAt: string;
}

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
  project: {
    id: string;
    name: string;
  };
  labels?: Array<{
    id: string;
    label: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  comments: Comment[];
  createdAt: string;
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

export const IssueDetail = () => {
  const { id: projectId, issueId } = useParams<{ id: string; issueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [commentContent, setCommentContent] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [pendingCommentFiles, setPendingCommentFiles] = useState<File[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [editingCommentFiles, setEditingCommentFiles] = useState<File[]>([]);

  // 프로젝트 정보 및 권한 확인
  const { data: projectData, error: projectError } = useQuery<{ project: any; userRole?: 'OWNER' | 'MEMBER' | 'VIEWER' }>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
    retry: false,
  });

  const userRole = projectData?.userRole || 'VIEWER';
  const canEdit = userRole === 'OWNER' || userRole === 'MEMBER';

  const { data, isLoading, error: issueError } = useQuery<{ issue: Issue }>({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const response = await api.get(`/issues/${issueId}`);
      return response.data;
    },
    retry: false,
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post('/comments', {
        content,
        issueId,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      // 활동 로그 갱신
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activities', projectId, issueId] });
      const newCommentId = data.comment.id;
      setCommentContent('');

      // 댓글 생성 후 대기 중인 파일이 있으면 업로드
      if (pendingCommentFiles.length > 0) {
        try {
          const formData = new FormData();
          pendingCommentFiles.forEach((file) => {
            formData.append('files', file);
            console.log('Appending file to FormData:', {
              name: file.name,
              size: file.size,
              type: file.type
            });
          });
          formData.append('commentId', newCommentId);
          console.log('Uploading files for comment:', newCommentId, 'Files count:', pendingCommentFiles.length);

          const response = await api.post('/attachments/upload', formData);
          console.log('File upload success:', response.data);
          toast.success('댓글과 파일이 등록되었습니다.');
          queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
        } catch (err: any) {
          console.error('File upload error:', err);
          console.error('Error response:', err.response?.data);
          console.error('Error status:', err.response?.status);
          const errorMessage = err.response?.data?.error || err.message || '파일 업로드에 실패했습니다.';
          toast.error(errorMessage);
          // 에러가 발생해도 댓글은 이미 등록되었으므로 성공 메시지 표시
          toast.success('댓글이 등록되었습니다. (파일 업로드 실패)');
        }
        setPendingCommentFiles([]);
      } else {
        toast.success('댓글이 등록되었습니다.');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '댓글 등록에 실패했습니다.');
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentContent.trim()) {
      commentMutation.mutate(commentContent.trim());
    }
  };

  // 댓글 수정 mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await api.put(`/comments/${commentId}`, { content });
      return response.data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activities', projectId, issueId] });
      
      // 댓글 수정 후 대기 중인 파일이 있으면 업로드
      if (editingCommentFiles.length > 0) {
        try {
          const formData = new FormData();
          editingCommentFiles.forEach((file) => {
            formData.append('files', file);
          });
          formData.append('commentId', variables.commentId);

          await api.post('/attachments/upload', formData);
          toast.success('댓글과 파일이 수정되었습니다.');
          queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
        } catch (err: any) {
          console.error('File upload error:', err);
          const errorMessage = err.response?.data?.error || err.message || '파일 업로드에 실패했습니다.';
          toast.error(errorMessage);
          toast.success('댓글이 수정되었습니다. (파일 업로드 실패)');
        }
        setEditingCommentFiles([]);
      } else {
        toast.success('댓글이 수정되었습니다.');
      }
      
      setEditingCommentId(null);
      setEditingCommentContent('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '댓글 수정에 실패했습니다.');
    },
  });

  // 댓글 삭제 mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      queryClient.invalidateQueries({ queryKey: ['activities', projectId, issueId] });
      toast.success('댓글이 삭제되었습니다.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '댓글 삭제에 실패했습니다.');
    },
  });

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
    setEditingCommentFiles([]);
  };

  const handleSaveEdit = () => {
    if (editingCommentId && editingCommentContent.trim()) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content: editingCommentContent.trim(),
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('이 댓글을 삭제하시겠습니까?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // 에러 처리
  if (projectError || issueError) {
    const error = (projectError || issueError) as any;
    const statusCode = error?.response?.status;
    const errorMessage = error?.response?.data?.error || '데이터를 불러올 수 없습니다.';

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
            {statusCode === 404 ? '프로젝트 또는 이슈를 찾을 수 없습니다.' : errorMessage}
          </p>
          {statusCode === 404 && (
            <p className="text-gray-500 text-sm mb-4">
              데이터베이스가 리셋되었거나 해당 항목이 삭제되었을 수 있습니다.
              <br />
              2초 후 대시보드로 이동합니다...
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

  const issue = data?.issue;

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">이슈를 찾을 수 없습니다.</p>
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-700"
          >
            대시보드로 돌아가기
          </Link>
        </div>
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
          ← {issue.project.name}로 돌아가기
        </Link>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {issue.title}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
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
                {issue.labels && issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {issue.labels.map((issueLabel) => (
                      <span
                        key={issueLabel.id}
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: issueLabel.label.color }}
                      >
                        {issueLabel.label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate(`/projects/${projectId}/issues/${issueId}/edit`)}
              disabled={!canEdit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canEdit ? '이슈를 수정할 권한이 없습니다.' : ''}
            >
              수정
            </button>
          </div>

          {issue.description && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">설명</h3>
              <p className="text-gray-900 whitespace-pre-wrap">
                {issue.description}
              </p>
            </div>
          )}

          {/* 이슈 첨부파일 */}
          {issue.attachments && issue.attachments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">첨부파일</h3>
              <AttachmentList
                attachments={issue.attachments}
                canDelete={canEdit}
                onDelete={() => {
                  queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
                }}
              />
            </div>
          )}

          {/* 파일 첨부 */}
          {canEdit && (
            <div className="mt-4">
              <FileAttachment
                issueId={issueId}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
                }}
              />
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">작성자:</span>
                <span className="ml-2 text-gray-900">{issue.author.username}</span>
              </div>
              {issue.assignee && (
                <div>
                  <span className="text-gray-500">담당자:</span>
                  <span className="ml-2 text-gray-900">
                    {issue.assignee.username}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">생성일:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(issue.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 및 히스토리 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* 탭 */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'comments'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              댓글 ({issue.comments.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              히스토리
            </button>
          </div>

          {/* 댓글 탭 */}
          {activeTab === 'comments' && (
            <>
              {/* 댓글 작성 폼 */}
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                />
                {canEdit && (
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      파일 첨부 (댓글 작성 후 자동 업로드)
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setPendingCommentFiles(files);
                      }}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    />
                    {pendingCommentFiles.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        {pendingCommentFiles.length}개 파일 선택됨
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={commentMutation.isPending || !commentContent.trim() || !canEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canEdit ? '댓글을 작성할 권한이 없습니다.' : ''}
                >
                  {commentMutation.isPending ? '작성 중...' : '댓글 작성'}
                </button>
              </form>

              {/* 댓글 목록 */}
              <div className="space-y-4">
                {issue.comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">댓글이 없습니다.</p>
                ) : (
                  issue.comments.map((comment) => {
                    const isAuthor = user?.id === comment.author.id;
                    const canModify = isAuthor || userRole === 'OWNER';

                    return (
                      <div
                        key={comment.id}
                        className="border-l-4 border-indigo-500 pl-4 py-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {comment.author.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString('ko-KR')}
                              </span>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  autoFocus
                                />
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    파일 첨부 (수정 후 자동 업로드)
                                  </label>
                                  <input
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      setEditingCommentFiles(files);
                                    }}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                  />
                                  {editingCommentFiles.length > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      {editingCommentFiles.length}개 파일 선택됨
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={updateCommentMutation.isPending || !editingCommentContent.trim()}
                                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {updateCommentMutation.isPending ? '저장 중...' : '저장'}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={updateCommentMutation.isPending}
                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-gray-700 whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <AttachmentList
                                    attachments={comment.attachments}
                                    canDelete={canEdit}
                                    onDelete={() => {
                                      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
                                    }}
                                  />
                                )}
                              </>
                            )}
                          </div>
                          {canModify && editingCommentId !== comment.id && (
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="text-xs text-indigo-600 hover:text-indigo-700"
                                title="수정"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={deleteCommentMutation.isPending}
                                className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                                title="삭제"
                              >
                                {deleteCommentMutation.isPending ? '삭제 중...' : '삭제'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* 히스토리 탭 */}
          {activeTab === 'history' && (
            <ActivityLog issueId={issueId} />
          )}
        </div>
      </div>
    </div>
  );
};

