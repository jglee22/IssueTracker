import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { generateToken } from '../src/utils/jwt';

describe('Issue API - 이슈 생성', () => {
  const TEST_EMAIL = 'test-issue@example.com';
  const TEST_USERNAME = 'test-issue-user';
  const TEST_PASSWORD = 'test123456';
  const TEST_NAME = 'Test Issue User';

  let userId: string;
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    // 기존 테스트 데이터 정리
    await prisma.issue.deleteMany({
      where: {
        project: {
          owner: {
            email: TEST_EMAIL,
          },
        },
      },
    });
    await prisma.project.deleteMany({
      where: {
        owner: {
          email: TEST_EMAIL,
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL },
    });

    // 테스트 유저 생성
    const hashedPassword = await hashPassword(TEST_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        password: hashedPassword,
        name: TEST_NAME,
        status: 'ACTIVE',
        role: 'MEMBER',
      },
    });

    userId = user.id;
    token = generateToken(user.id);

    // 테스트 프로젝트 생성 (유저가 소유자)
    const project = await prisma.project.create({
      data: {
        name: 'Test Project for Issue Creation',
        description: 'Test project description',
        ownerId: userId,
      },
    });

    projectId = project.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.issue.deleteMany({
      where: {
        project: {
          owner: {
            email: TEST_EMAIL,
          },
        },
      },
    });
    await prisma.project.deleteMany({
      where: {
        owner: {
          email: TEST_EMAIL,
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL },
    });
    await prisma.$disconnect();
  });

  describe('이슈 생성 성공', () => {
    it('필수 필드(title, projectId)가 제공되면 201과 issueId를 반환한다', async () => {
      const issueData = {
        title: 'Test Issue Title',
        description: 'Test issue description',
        projectId,
        status: 'OPEN',
        priority: 'MEDIUM',
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${token}`)
        .send(issueData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Issue created successfully');
      expect(response.body).toHaveProperty('issue');
      expect(response.body.issue).toHaveProperty('id');
      expect(response.body.issue.title).toBe(issueData.title);
      expect(response.body.issue.description).toBe(issueData.description);
      expect(response.body.issue.status).toBe(issueData.status);
      expect(response.body.issue.priority).toBe(issueData.priority);
      expect(response.body.issue.projectId).toBe(projectId);
      expect(response.body.issue.authorId).toBe(userId);
    });

    it('최소 필수 필드(title, projectId)만 제공해도 이슈가 생성된다', async () => {
      const issueData = {
        title: 'Minimal Issue',
        projectId,
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${token}`)
        .send(issueData);

      expect(response.status).toBe(201);
      expect(response.body.issue).toHaveProperty('id');
      expect(response.body.issue.title).toBe(issueData.title);
      expect(response.body.issue.status).toBe('OPEN'); // 기본값
      expect(response.body.issue.priority).toBe('MEDIUM'); // 기본값
    });
  });

  describe('이슈 생성 실패', () => {
    it('title이 없으면 400 Bad Request를 반환한다', async () => {
      const issueData = {
        description: 'Test description',
        projectId,
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${token}`)
        .send(issueData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Title is required');
    });

    it('projectId가 없으면 400 Bad Request를 반환한다', async () => {
      const issueData = {
        title: 'Test Issue',
        description: 'Test description',
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${token}`)
        .send(issueData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Project ID is required');
    });

    it('존재하지 않는 projectId를 사용하면 404 Not Found를 반환한다', async () => {
      const issueData = {
        title: 'Test Issue',
        projectId: 'non-existent-project-id',
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${token}`)
        .send(issueData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Project not found');
    });

    it('토큰 없이 요청하면 401 Unauthorized를 반환한다', async () => {
      const issueData = {
        title: 'Test Issue',
        projectId,
      };

      const response = await request(app)
        .post('/api/issues')
        .send(issueData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Access token required');
    });
  });
});

