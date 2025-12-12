# Issue Tracker - 포트폴리오 프로젝트

이슈 트래커는 프로젝트의 버그, 기능 요청, 작업 항목을 관리하는 웹 애플리케이션입니다.

## 프로젝트 구조

```
IssueTracker/
├── Backend/          # 백엔드 서버 (Node.js + Express + TypeScript)
├── Frontend/         # 프론트엔드 앱 (React + TypeScript + Vite)
└── README.md
```

## 주요 기능

- 사용자 인증/인가 (회원가입, 로그인)
- 프로젝트 관리
- 이슈 생성/수정/삭제
- 이슈 상태 관리 (열림, 진행중, 완료)
- 댓글 기능
- 라벨/태그 관리
- 검색 및 필터링

## 기술 스택

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (또는 MySQL)
- Prisma ORM
- JWT 인증

### Frontend
- React + TypeScript + Vite
- React Query + Context (상태관리)
- Tailwind CSS
- React Router

## 시작하기

### Backend 실행

1. 환경 변수 설정:
   - `Backend/.env` 파일을 생성하고 다음 변수들을 설정하세요:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://username:password@localhost:5432/issue_tracker?schema=public"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173,http://localhost:3000
   ```
   - 자세한 설정 방법은 `Backend/SETUP.md`를 참고하세요.

2. 의존성 설치 및 데이터베이스 마이그레이션:
```bash
cd Backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend 실행

1. 환경 변수 설정 (선택사항):
   - `Frontend/.env` 파일을 생성하고 API URL을 설정할 수 있습니다:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
   - 설정하지 않으면 기본값(`http://localhost:5000/api`)이 사용됩니다.

2. 의존성 설치 및 실행:
```bash
cd Frontend
npm install
npm run dev
```
