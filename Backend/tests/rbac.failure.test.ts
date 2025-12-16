import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { generateToken } from '../src/utils/jwt';

describe('RBAC API - 권한 없는 유저의 관리자 API 접근 차단', () => {
  const TEST_EMAIL = 'test-rbac@example.com';
  const TEST_USERNAME = 'test-rbac-user';
  const TEST_PASSWORD = 'test123456';
  const TEST_NAME = 'Test RBAC User';

  let memberUserId: string;
  let memberToken: string;

  beforeAll(async () => {
    // 기존 테스트 유저 삭제
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL },
    });

    // 일반 MEMBER 유저 생성 (ACTIVE 상태)
    const hashedPassword = await hashPassword(TEST_PASSWORD);
    const memberUser = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        password: hashedPassword,
        name: TEST_NAME,
        status: 'ACTIVE',
        role: 'MEMBER', // 일반 유저
      },
    });

    memberUserId = memberUser.id;
    memberToken = generateToken(memberUser.id);
  });

  afterAll(async () => {
    // 테스트 유저 정리
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL },
    });
    await prisma.$disconnect();
  });

  describe('일반 MEMBER 유저가 관리자 전용 API 호출 시', () => {
    it('GET /api/admin/users 호출 시 403 Forbidden을 반환한다', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Admin access required');
    });

    it('POST /api/admin/users/:id/approve 호출 시 403 Forbidden을 반환한다', async () => {
      // 다른 유저 ID (실제로는 존재하지 않아도 됨, 권한 체크가 먼저 실행되므로)
      const fakeUserId = 'fake-user-id';

      const response = await request(app)
        .post(`/api/admin/users/${fakeUserId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'MEMBER' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Admin access required');
    });

    it('POST /api/admin/users/:id/reject 호출 시 403 Forbidden을 반환한다', async () => {
      const fakeUserId = 'fake-user-id';

      const response = await request(app)
        .post(`/api/admin/users/${fakeUserId}/reject`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'Test rejection' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('토큰 없이 관리자 API 호출 시', () => {
    it('GET /api/admin/users 호출 시 401 Unauthorized를 반환한다', async () => {
      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Access token required');
    });
  });
});

