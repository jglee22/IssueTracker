import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';

const TEST_EMAIL = 'test-login@example.com';
const TEST_PASSWORD = 'password123';

describe('Auth API - 로그인 성공', () => {
  beforeAll(async () => {
    // 기존 테스트 유저 삭제
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL },
    });

    const hashed = await hashPassword(TEST_PASSWORD);

    // ACTIVE 상태의 사용자 생성
    await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        username: 'test-login-user',
        name: '테스트 유저',
        password: hashed,
        status: 'ACTIVE',
        role: 'MEMBER',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('이메일/비밀번호가 올바르면 200과 access token을 반환한다', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toMatchObject({
      email: TEST_EMAIL,
      username: 'test-login-user',
      status: 'ACTIVE',
    });
  });
});


