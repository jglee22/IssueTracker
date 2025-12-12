import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'test@example.com';
  const username = 'testuser';
  const password = 'password123';
  const name = 'Test User';

  // 기존 사용자 확인
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    console.log('이미 존재하는 사용자입니다.');
    console.log(`이메일: ${email}`);
    console.log(`사용자명: ${username}`);
    console.log(`비밀번호: ${password}`);
    await prisma.$disconnect();
    return;
  }

  // 비밀번호 해시화
  const hashedPassword = await bcrypt.hash(password, 10);

  // 사용자 생성
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      name,
    },
  });

  console.log('테스트 사용자가 생성되었습니다!');
  console.log(`이메일: ${email}`);
  console.log(`사용자명: ${username}`);
  console.log(`비밀번호: ${password}`);
  console.log(`사용자 ID: ${user.id}`);

  await prisma.$disconnect();
}

createTestUser().catch((error) => {
  console.error('에러:', error);
  process.exit(1);
});

