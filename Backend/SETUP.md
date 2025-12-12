# 데이터베이스 설정 가이드

## 1. 데이터베이스 생성

### PostgreSQL 사용 시
```sql
CREATE DATABASE issue_tracker;
```

### MySQL 사용 시
```sql
CREATE DATABASE issue_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. .env 파일 설정

`Backend/.env` 파일을 생성하고 다음 환경 변수들을 설정하세요.

### 필수 환경 변수:

```env
# 서버 포트
PORT=5000

# 데이터베이스 연결 URL
# PostgreSQL 예시:
DATABASE_URL="postgresql://username:password@localhost:5432/issue_tracker?schema=public"

# MySQL 예시:
# DATABASE_URL="mysql://username:password@localhost:3306/issue_tracker"

# JWT 인증 설정 (필수 - 프로덕션에서는 반드시 강력한 비밀번호 사용)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS 설정 (쉼표로 구분하여 여러 origin 허용 가능)
# 개발 환경 예시:
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
# 프로덕션 환경 예시:
# CORS_ORIGIN=https://yourdomain.com
```

**중요**: 
- `JWT_SECRET`은 반드시 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 프로덕션 환경에서는 강력하고 랜덤한 JWT_SECRET을 사용하세요.
- `.env` 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 포함되어 있음).

**주의**: MySQL을 사용하는 경우 `prisma/schema.prisma` 파일의 `datasource db` 부분을 다음과 같이 변경해야 합니다:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

## 3. Prisma 클라이언트 생성 및 마이그레이션

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 마이그레이션 실행 (데이터베이스에 테이블 생성)
npx prisma migrate dev --name init

# 또는 개발 중 스키마 변경 시
npx prisma migrate dev
```

## 4. 테이블 확인

### Prisma Studio 사용 (GUI)
```bash
npx prisma studio
```

### 또는 API 엔드포인트로 확인
서버 실행 후:
- `http://localhost:5000/api/db/test` - 연결 테스트
- `http://localhost:5000/api/db/tables` - 테이블 목록
- `http://localhost:5000/api/db/stats` - 각 테이블 레코드 수

## 5. 서버 실행

```bash
npm run dev
```

