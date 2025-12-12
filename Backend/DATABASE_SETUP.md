# PostgreSQL 데이터베이스 설정 가이드

## 1. 데이터베이스 생성

### 방법 1: pgAdmin 사용 (GUI)
1. pgAdmin을 실행합니다
2. 서버에 연결합니다 (보통 localhost)
3. 데이터베이스를 우클릭하고 "Create" > "Database..." 선택
4. Database name에 `issue_tracker` 입력
5. Save 클릭

### 방법 2: psql 사용 (명령줄)
PostgreSQL 설치 경로의 bin 폴더에서 실행:
```bash
# 예: C:\Program Files\PostgreSQL\16\bin\psql.exe -U postgres
psql -U postgres

# psql에서 실행:
CREATE DATABASE issue_tracker;
\q
```

### 방법 3: SQL 쿼리 도구 사용
PostgreSQL에 연결된 SQL 쿼리 도구에서:
```sql
CREATE DATABASE issue_tracker;
```

## 2. .env 파일 설정

`Backend/.env` 파일을 열고 `DATABASE_URL`을 실제 PostgreSQL 정보로 수정하세요:

```
DATABASE_URL="postgresql://사용자명:비밀번호@localhost:5432/issue_tracker?schema=public"
```

**기본 설정 예시:**
- 사용자명: `postgres` (기본 관리자 계정)
- 비밀번호: 설치 시 설정한 비밀번호
- 포트: `5432` (기본 포트)

**예시:**
```
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/issue_tracker?schema=public"
```

## 3. 마이그레이션 실행

데이터베이스가 생성되고 .env 파일이 설정되면:

```bash
cd Backend
npx prisma migrate dev --name init
```

## 4. 테이블 확인

마이그레이션 후 Prisma Studio로 확인:
```bash
npx prisma studio
```

또는 API 엔드포인트로 확인:
- 서버 실행 후 `http://localhost:5000/api/db/tables` 접속

