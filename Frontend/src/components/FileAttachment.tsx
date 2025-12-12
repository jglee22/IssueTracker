import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface FileAttachmentProps {
  issueId?: string;
  commentId?: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export const FileAttachment = ({ issueId, commentId, onUploadComplete, disabled }: FileAttachmentProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      if (issueId) {
        formData.append('issueId', issueId);
      }
      if (commentId) {
        formData.append('commentId', commentId);
      }

      const response = await api.post('/attachments/upload', formData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('파일이 업로드되었습니다.');
      setSelectedFiles([]);
      if (onUploadComplete) {
        onUploadComplete();
      }
      // 관련 쿼리 무효화
      if (issueId) {
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
        queryClient.invalidateQueries({ queryKey: ['issues'] });
      }
      if (commentId) {
        queryClient.invalidateQueries({ queryKey: ['issue'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '파일 업로드에 실패했습니다.');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFiles);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label
          className={`px-3 py-1.5 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          파일 선택
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
        </label>
        {selectedFiles.length > 0 && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={disabled || isUploading}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-1">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
              <span className="text-gray-700 truncate flex-1">
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                disabled={isUploading}
                className="ml-2 text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface AttachmentListProps {
  attachments: Array<{
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
  onDelete?: (attachmentId: string) => void;
  canDelete?: boolean;
}

export const AttachmentList = ({ attachments, onDelete, canDelete = false }: AttachmentListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/attachments/${attachmentId}`);
    },
    onSuccess: (_, attachmentId) => {
      toast.success('파일이 삭제되었습니다.');
      if (onDelete) {
        onDelete(attachmentId);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || '파일 삭제에 실패했습니다.');
    },
  });

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const response = await api.get(`/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      
      // Blob을 URL로 변환하여 다운로드
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(err.response?.data?.error || '파일 다운로드에 실패했습니다.');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('이 파일을 삭제하시겠습니까?')) return;
    setDeletingId(attachmentId);
    try {
      await deleteMutation.mutateAsync(attachmentId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  // 이미지 URL 로드
  useEffect(() => {
    const loadImageUrls = async () => {
      const imageAttachments = attachments.filter(att => isImage(att.mimeType));
      
      for (const attachment of imageAttachments) {
        if (!imageUrls[attachment.id]) {
          try {
            const response = await api.get(`/attachments/${attachment.id}/download`, {
              responseType: 'blob',
            });
            const url = window.URL.createObjectURL(response.data);
            setImageUrls(prev => ({ ...prev, [attachment.id]: url }));
          } catch (err) {
            console.error('Failed to load image:', err);
          }
        }
      }
    };

    loadImageUrls();

    // Cleanup: 컴포넌트 언마운트 시 URL 해제
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          window.URL.revokeObjectURL(url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-2 space-y-2">
        {attachments.map((attachment) => {
          const imageUrl = isImage(attachment.mimeType) ? imageUrls[attachment.id] : null;

          return (
            <div key={attachment.id} className="space-y-1">
              {isImage(attachment.mimeType) ? (
                <div className="space-y-1">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={attachment.originalName || attachment.filename || '이미지'}
                      className="max-w-full h-auto rounded-md border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '300px' }}
                      onClick={() => setExpandedImageId(attachment.id)}
                      onError={(e) => {
                        // 이미지 로드 실패 시 파일 다운로드 링크로 대체
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center p-4 bg-gray-100 rounded-md border border-gray-200">
                      <span className="text-gray-500 text-sm">이미지 로딩 중...</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{attachment.originalName || attachment.filename || '이미지'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(attachment.id, attachment.originalName || attachment.filename || 'file')}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        다운로드
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(attachment.id)}
                          disabled={deletingId === attachment.id}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === attachment.id ? '삭제 중...' : '삭제'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded hover:bg-gray-100">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span>{getFileIcon(attachment.mimeType)}</span>
                    <button
                      onClick={() => handleDownload(attachment.id, attachment.originalName || attachment.filename || 'file')}
                      className="text-indigo-600 hover:text-indigo-700 truncate flex-1 text-left"
                    >
                      {attachment.originalName || attachment.filename || '파일'}
                    </button>
                    <span className="text-gray-500 text-xs">{formatFileSize(attachment.size)}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                      className="ml-2 text-red-600 hover:text-red-700 disabled:opacity-50 text-xs"
                    >
                      {deletingId === attachment.id ? '삭제 중...' : '삭제'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 이미지 확대 보기 모달 */}
      {expandedImageId && imageUrls[expandedImageId] && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImageId(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setExpandedImageId(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
            >
              ✕
            </button>
            <img
              src={imageUrls[expandedImageId]}
              alt="확대 이미지"
              className="max-w-full max-h-[90vh] rounded-md"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

