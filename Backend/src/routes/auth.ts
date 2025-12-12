import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// 회원가입
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, name } = req.body;

    // 입력 검증
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, username, and password are required',
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    // 이메일/사용자명 중복 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email or username already exists',
      });
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(password);

    // 첫 사용자 여부 확인 (없으면 관리자/즉시 활성화)
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name || null,
        status: isFirstUser ? 'ACTIVE' : 'PENDING',
        role: isFirstUser ? 'ADMIN' : 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });

    if (isFirstUser) {
      // 첫 사용자는 바로 로그인 가능
      const token = generateToken(user.id);
      return res.status(201).json({
        message: 'Admin user created successfully',
        user,
        token,
      });
    }

    // 이후 사용자는 승인 대기
    res.status(201).json({
      message: 'Registration submitted. Awaiting admin approval.',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 로그인
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // 이메일은 유니크
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 상태 확인
    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Account pending approval' });
    }
    if (user.status === 'REJECTED') {
      return res.status(403).json({
        error: 'Account rejected',
        reason: user.rejectionReason || null,
      });
    }

    // JWT 토큰 생성
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        status: user.status,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 현재 사용자 정보 조회 (인증 필요)
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

