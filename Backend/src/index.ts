import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './lib/prisma';
import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import projectMemberRoutes from './routes/projectMembers';
import issueRoutes from './routes/issues';
import commentRoutes from './routes/comments';
import labelRoutes from './routes/labels';
import userRoutes from './routes/users';
import activityRoutes from './routes/activities';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import realtimeRoutes from './routes/realtime';
import attachmentRoutes from './routes/attachments';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;

// CORS 설정
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://issuetracker-lee-jeong-gyus-projects.vercel.app',
      'https://issuetracker-h9dy59x1l-lee-jeong-gyus-projects.vercel.app',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      const isVercelPreview = origin?.endsWith('.vercel.app');
      const isRailway = origin?.includes('.up.railway.app');

      // 개발 환경에서는 origin이 없는 요청도 허용 (Postman 등)
      if (!origin || allowedOrigins.includes(origin) || isVercelPreview || isRailway) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
// 프리플라이트(OPTIONS) 전역 허용
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 정적 파일 서빙 (업로드된 파일)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Issue Tracker API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', projectMemberRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/users', userRoutes);
app.use('/api', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', realtimeRoutes);
app.use('/api/attachments', attachmentRoutes);

// 데이터베이스 연결 테스트 엔드포인트
app.get('/api/db/test', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 테이블 목록 확인 엔드포인트
app.get('/api/db/tables', async (req, res) => {
  try {
    // PostgreSQL의 경우 테이블 목록 조회
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    res.json({
      status: 'ok',
      tables: tables.map(t => t.tablename),
      count: tables.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tables',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 각 테이블의 레코드 수 확인
app.get('/api/db/stats', async (req, res) => {
  try {
    const stats = {
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      issues: await prisma.issue.count(),
      comments: await prisma.comment.count(),
      labels: await prisma.label.count(),
      issueLabels: await prisma.issueLabel.count(),
    };

    res.json({
      status: 'ok',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
async function startServer() {
  // 데이터베이스 연결
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.error('⚠️  Warning: Database connection failed. Server will start but database operations may fail.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Database test: http://localhost:${PORT}/api/db/test`);
    console.log(`📋 Tables list: http://localhost:${PORT}/api/db/tables`);
    console.log(`📈 Database stats: http://localhost:${PORT}/api/db/stats`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

