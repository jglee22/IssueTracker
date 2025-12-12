import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// uploads 디렉토리 생성
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // 고유한 파일명 생성: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 허용할 파일 타입 (필요에 따라 수정)
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: images, PDF, Office documents, text files.'));
    }
  },
});

// 파일 업로드 (이슈 또는 댓글에 첨부)
router.post(
  '/upload',
  authenticateToken,
  (req, res, next) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size exceeds 10MB limit' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum 10 files allowed' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { issueId, commentId } = req.body;
      const files = req.files as Express.Multer.File[];

      console.log('File upload request:', {
        userId,
        issueId,
        commentId,
        filesCount: files?.length || 0,
        files: files?.map(f => ({ 
          name: f.originalname, 
          nameEncoded: Buffer.from(f.originalname, 'latin1').toString('utf8'),
          size: f.size, 
          mimetype: f.mimetype 
        }))
      });

      if (!files || files.length === 0) {
        console.error('No files in request');
        return res.status(400).json({ error: 'No files uploaded' });
      }

      if (!issueId && !commentId) {
        console.error('Missing issueId and commentId');
        return res.status(400).json({ error: 'Either issueId or commentId is required' });
      }

      // 권한 확인
      if (issueId) {
        const issue = await prisma.issue.findUnique({
          where: { id: issueId },
          include: {
            project: {
              select: {
                ownerId: true,
                members: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            },
          },
        });

        if (!issue) {
          return res.status(404).json({ error: 'Issue not found' });
        }

        const isOwner = issue.project.ownerId === userId;
        const isMember = issue.project.members.length > 0;

        if (!isOwner && !isMember) {
          return res.status(403).json({ error: 'You do not have permission to attach files to this issue' });
        }
      }

      if (commentId) {
        const comment = await prisma.comment.findUnique({
          where: { id: commentId },
          include: {
            issue: {
              include: {
                project: {
                  select: {
                    ownerId: true,
                    members: {
                      where: { userId },
                      select: { userId: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        const isOwner = comment.issue.project.ownerId === userId;
        const isMember = comment.issue.project.members.length > 0;

        if (!isOwner && !isMember) {
          return res.status(403).json({ error: 'You do not have permission to attach files to this comment' });
        }
      }

      // 파일 정보 저장 (파일명 인코딩 처리)
      const attachments = await Promise.all(
        files.map((file) => {
          // multer가 파일명을 잘못 인코딩할 수 있으므로 수정
          let originalName = file.originalname;
          // Latin1로 잘못 인코딩된 경우 UTF-8로 변환
          try {
            originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch (e) {
            // 변환 실패 시 원본 사용
            console.warn('Filename encoding conversion failed, using original:', file.originalname);
          }
          
          return prisma.attachment.create({
            data: {
              filename: file.filename,
              originalName: originalName,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
              issueId: issueId || null,
              commentId: commentId || null,
              uploadedById: userId,
            },
          });
        })
      );

      res.status(201).json({
        message: 'Files uploaded successfully',
        attachments: attachments.map((att) => ({
          id: att.id,
          filename: att.originalName,
          size: att.size,
          mimeType: att.mimeType,
        })),
      });
    } catch (error) {
      console.error('File upload error:', error);
      // 업로드된 파일이 있으면 삭제
      if (req.files && Array.isArray(req.files)) {
        (req.files as Express.Multer.File[]).forEach((file) => {
          if (fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkError) {
              console.error('Failed to delete uploaded file:', unlinkError);
            }
          }
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      // Prisma 에러인 경우 더 자세한 정보 제공
      if (error instanceof Error && error.message.includes('Unknown arg')) {
        return res.status(500).json({ 
          error: 'Database schema error. Please run: npx prisma migrate dev' 
        });
      }
      res.status(500).json({ error: errorMessage });
    }
  }
);

// 파일 다운로드
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            project: {
              select: {
                ownerId: true,
                members: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            },
          },
        },
        comment: {
          include: {
            issue: {
              include: {
                project: {
                  select: {
                    ownerId: true,
                    members: {
                      where: { userId },
                      select: { userId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // 권한 확인
    let hasPermission = false;
    if (attachment.issue) {
      const isOwner = attachment.issue.project.ownerId === userId;
      const isMember = attachment.issue.project.members.length > 0;
      hasPermission = isOwner || isMember;
    } else if (attachment.comment) {
      const isOwner = attachment.comment.issue.project.ownerId === userId;
      const isMember = attachment.comment.issue.project.members.length > 0;
      hasPermission = isOwner || isMember;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to download this file' });
    }

    // 파일 존재 확인
    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // 파일 다운로드 (파일명 인코딩 처리)
    const encodedFilename = encodeURIComponent(attachment.originalName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    
    const fileStream = fs.createReadStream(attachment.path);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 파일 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true },
        },
        issue: {
          include: {
            project: {
              select: {
                ownerId: true,
                members: {
                  where: { userId },
                  select: { userId: true, role: true },
                },
              },
            },
          },
        },
        comment: {
          include: {
            issue: {
              include: {
                project: {
                  select: {
                    ownerId: true,
                    members: {
                      where: { userId },
                      select: { userId: true, role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // 권한 확인: 업로드한 사용자 또는 프로젝트 소유자/멤버
    let hasPermission = attachment.uploadedBy.id === userId;

    if (!hasPermission) {
      if (attachment.issue) {
        const isOwner = attachment.issue.project.ownerId === userId;
        const isMember = attachment.issue.project.members.some((m) => m.role === 'OWNER' || m.role === 'MEMBER');
        hasPermission = isOwner || isMember;
      } else if (attachment.comment) {
        const isOwner = attachment.comment.issue.project.ownerId === userId;
        const isMember = attachment.comment.issue.project.members.some((m) => m.role === 'OWNER' || m.role === 'MEMBER');
        hasPermission = isOwner || isMember;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to delete this file' });
    }

    // 파일 삭제
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }

    // 데이터베이스에서 삭제
    await prisma.attachment.delete({
      where: { id },
    });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 이슈 또는 댓글의 첨부파일 목록 조회
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { issueId, commentId } = req.query;
    const userId = req.userId!;

    if (!issueId && !commentId) {
      return res.status(400).json({ error: 'Either issueId or commentId is required' });
    }

    // 권한 확인
    if (issueId) {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId as string },
        include: {
          project: {
            select: {
              ownerId: true,
              members: {
                where: { userId },
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      const isOwner = issue.project.ownerId === userId;
      const isMember = issue.project.members.length > 0;

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'You do not have permission to view attachments' });
      }
    }

    if (commentId) {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId as string },
        include: {
          issue: {
            include: {
              project: {
                select: {
                  ownerId: true,
                  members: {
                    where: { userId },
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const isOwner = comment.issue.project.ownerId === userId;
      const isMember = comment.issue.project.members.length > 0;

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'You do not have permission to view attachments' });
      }
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        issueId: issueId ? (issueId as string) : undefined,
        commentId: commentId ? (commentId as string) : undefined,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      attachments: attachments.map((att) => ({
        id: att.id,
        filename: att.originalName,
        size: att.size,
        mimeType: att.mimeType,
        uploadedBy: att.uploadedBy,
        createdAt: att.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

