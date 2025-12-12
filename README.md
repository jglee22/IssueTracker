# Issue Tracker - 풀스택 이슈 관리 시스템

프로젝트의 버그, 기능 요청, 작업 항목을 체계적으로 관리하는 풀스택 웹 애플리케이션입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [배포 정보](#배포-정보)
- [환경 변수 설정](#환경-변수-설정)
- [개발 과정 및 트러블슈팅](#개발-과정-및-트러블슈팅)
- [주요 특징](#주요-특징)

---

## 🎯 프로젝트 개요

이슈 트래커는 팀 협업을 위한 이슈 관리 시스템입니다. 프로젝트 생성부터 이슈 추적, 댓글 작성, 파일 첨부, 실시간 알림까지 모든 기능을 제공합니다.

### 핵심 기능
- ✅ 사용자 인증 및 권한 관리 (JWT 기반)
- ✅ 프로젝트 및 이슈 CRUD
- ✅ 칸반 보드 (드래그 앤 드롭)
- ✅ 댓글 및 파일 첨부
- ✅ 실시간 알림 (SSE)
- ✅ 활동 로그 및 통계 대시보드

---

## 🚀 주요 기능

### 1. 사용자 인증 및 권한 관리
- 회원가입/로그인 (JWT 토큰 기반)
- 관리자 승인 기반 회원가입 시스템
- 역할 기반 접근 제어 (ADMIN, MEMBER, PENDING, REJECTED)
- 비밀번호 암호화 (bcrypt)

### 2. 프로젝트 관리
- 프로젝트 CRUD
- 프로젝트 멤버 관리 (OWNER, MEMBER, VIEWER)
- 프로젝트 대시보드 (통계 차트)

### 3. 이슈 관리
- 이슈 CRUD
- 이슈 상태 관리 (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- 우선순위 설정 (LOW, MEDIUM, HIGH, URGENT)
- 라벨 관리 및 필터링
- 검색 기능

### 4. 칸반 보드
- 드래그 앤 드롭으로 이슈 상태 변경
- 상태별 컬럼 표시
- 실시간 업데이트

### 5. 댓글 기능
- 댓글 CRUD
- 댓글 수정/삭제 (작성자 또는 프로젝트 소유자)
- 댓글에 파일 첨부

### 6. 파일 첨부
- 이슈/댓글에 파일 첨부
- 다중 파일 업로드 (최대 10개)
- 이미지 미리보기 및 확대 보기
- 파일 다운로드/삭제

### 7. 실시간 알림
- Server-Sent Events (SSE) 기반 실시간 통신
- 알림 배지 및 드롭다운
- 읽음 처리 (개별/전체)

### 8. 활동 로그
- 모든 활동 기록 (이슈, 댓글, 멤버 변경 등)
- 이슈/프로젝트별 활동 조회

### 9. 통계 대시보드
- 이슈 상태별 분포 (Pie Chart)
- 우선순위별 분포 (Bar Chart)
- 담당자별 이슈 수

---

## 🛠️ 기술 스택

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Real-time**: Server-Sent Events (SSE)
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **Drag & Drop**: @dnd-kit
- **HTTP Client**: Axios

### 배포
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: Railway PostgreSQL

---

## 📁 프로젝트 구조

```
IssueTracker/
├── Backend/                    # 백엔드 서버
│   ├── src/
│   │   ├── index.ts           # 서버 진입점
│   │   ├── lib/
│   │   │   └── prisma.ts      # Prisma 클라이언트
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT 인증 미들웨어
│   │   ├── routes/            # API 라우트
│   │   │   ├── auth.ts        # 인증 관련
│   │   │   ├── projects.ts    # 프로젝트 관리
│   │   │   ├── issues.ts      # 이슈 관리
│   │   │   ├── comments.ts    # 댓글 관리
│   │   │   ├── attachments.ts # 파일 첨부
│   │   │   ├── admin.ts       # 관리자 기능
│   │   │   └── ...
│   │   └── utils/             # 유틸리티 함수
│   ├── prisma/
│   │   ├── schema.prisma      # 데이터베이스 스키마
│   │   └── migrations/        # 마이그레이션 파일
│   ├── uploads/               # 업로드된 파일 저장소
│   └── package.json
│
├── Frontend/                   # 프론트엔드 앱
│   ├── src/
│   │   ├── App.tsx            # 메인 앱 컴포넌트
│   │   ├── main.tsx           # 진입점
│   │   ├── components/        # 재사용 가능한 컴포넌트
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── FileAttachment.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   └── ...
│   │   ├── pages/             # 페이지 컴포넌트
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   └── ...
│   │   ├── contexts/          # Context API
│   │   │   └── AuthContext.tsx
│   │   ├── lib/
│   │   │   └── api.ts         # API 클라이언트 설정
│   │   └── hooks/             # 커스텀 훅
│   └── package.json
│
└── README.md
```

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 9 이상
- PostgreSQL 데이터베이스

### Backend 설정

1. **의존성 설치**
```bash
cd Backend
npm install
```

2. **환경 변수 설정**
`Backend/.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/issue_tracker?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:3001
```

3. **데이터베이스 마이그레이션**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **개발 서버 실행**
```bash
npm run dev
```

백엔드 서버가 `http://localhost:5000`에서 실행됩니다.

### Frontend 설정

1. **의존성 설치**
```bash
cd Frontend
npm install
```

2. **환경 변수 설정 (선택사항)**
`Frontend/.env` 파일을 생성하고 API URL을 설정할 수 있습니다:

```env
VITE_API_URL=http://localhost:5000/api
```

설정하지 않으면 기본값(`http://localhost:5000/api`)이 사용됩니다.

3. **개발 서버 실행**
```bash
npm run dev
```

프론트엔드 앱이 `http://localhost:5173` (또는 `http://localhost:3001`)에서 실행됩니다.

---

## 🌐 배포 정보

### 배포 환경

- **Frontend**: [Vercel](https://vercel.com)
- **Backend**: [Railway](https://railway.app)
- **Database**: Railway PostgreSQL

### 배포 URL

- **프론트엔드**: `https://issuetracker-lee-jeong-gyus-projects.vercel.app`
- **백엔드 API**: `https://issuetracker-production-8ff1.up.railway.app/api`

### 배포 과정

1. **Railway 백엔드 배포**
   - GitHub 저장소 연결
   - PostgreSQL 서비스 프로비저닝
   - 환경 변수 설정
   - 자동 배포

2. **Vercel 프론트엔드 배포**
   - GitHub 저장소 연결
   - Root Directory: `Frontend` 설정
   - 환경 변수 설정 (`VITE_API_URL`)
   - 자동 배포

3. **데이터베이스 마이그레이션**
   - Railway 콘솔 또는 로컬에서 `npx prisma migrate deploy` 실행

---

## ⚙️ 환경 변수 설정

### Backend (Railway)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | JWT 토큰 암호화 키 | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT 토큰 만료 시간 | `7d` |
| `CORS_ORIGIN` | 허용할 프론트엔드 도메인 (콤마로 구분) | `https://your-frontend.vercel.app` |
| `PORT` | 서버 포트 (Railway가 자동 설정) | `5000` |

### Frontend (Vercel)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_API_URL` | 백엔드 API URL | `https://your-backend.railway.app/api` |

---

## 🔧 개발 과정 및 트러블슈팅

### 주요 해결 사항

#### 1. CORS 설정 문제
**문제**: 프론트엔드에서 백엔드 API 호출 시 CORS 에러 발생

**해결**:
- 백엔드 `CORS_ORIGIN` 환경 변수에 Vercel 도메인 추가
- `app.options('*', cors())` 추가로 프리플라이트 요청 처리
- Vercel 프리뷰 도메인 자동 허용 로직 추가

```typescript
// Backend/src/index.ts
app.options('*', cors());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') || 
        origin.endsWith('.up.railway.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

#### 2. 데이터베이스 마이그레이션 문제
**문제**: 배포 후 `User` 테이블이 없어서 500 에러 발생

**해결**:
- Railway에서 PostgreSQL 서비스 프로비저닝
- `DATABASE_URL` 환경 변수 설정
- `npx prisma migrate deploy` 실행하여 마이그레이션 적용

#### 3. 파일 업로드 인증 문제
**문제**: `multipart/form-data` 요청 시 Authorization 헤더가 전달되지 않음

**해결**:
- Axios 인터셉터에서 FormData 요청 시 `Content-Type` 헤더 자동 제거
- 브라우저가 자동으로 `boundary`를 포함한 헤더 설정하도록 처리

```typescript
// Frontend/src/lib/api.ts
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});
```

#### 4. 파일명 인코딩 문제
**문제**: 한글 파일명이 깨져서 표시됨

**해결**:
- 백엔드에서 Latin1 → UTF-8 변환 로직 추가
- 다운로드 시 `Content-Disposition` 헤더에 `filename*=UTF-8''` 사용

#### 5. Vercel 빌드 에러
**문제**: TypeScript 컴파일 에러로 빌드 실패

**해결**:
- 미사용 변수 제거
- 타입 에러 수정 (`isLoading` → `isPending`)
- `vite-env.d.ts` 파일 추가하여 `import.meta.env` 타입 정의

---

## ✨ 주요 특징

### 1. 완전한 CRUD 기능
모든 엔티티(프로젝트, 이슈, 댓글, 라벨 등)에 대한 생성, 조회, 수정, 삭제 기능을 제공합니다.

### 2. 실시간 업데이트
Server-Sent Events (SSE)를 통한 실시간 데이터 동기화로 페이지 새로고침 없이 최신 상태를 유지합니다.

### 3. 권한 기반 접근 제어
세밀한 권한 관리 시스템으로 프로젝트별, 역할별 접근 권한을 제어합니다.

### 4. 파일 첨부 및 이미지 미리보기
이슈 및 댓글에 파일을 첨부할 수 있으며, 이미지는 자동으로 미리보기가 제공됩니다.

### 5. 데이터 시각화
프로젝트 통계를 차트로 시각화하여 한눈에 파악할 수 있습니다.

### 6. 사용자 친화적 UI
직관적인 인터페이스와 토스트 알림을 통한 즉각적인 피드백을 제공합니다.

### 7. 확장 가능한 아키텍처
모듈화된 코드 구조로 유지보수와 기능 확장이 용이합니다.

---

## 📝 라이선스

이 프로젝트는 포트폴리오 목적으로 제작되었습니다.

---

## 👤 개발자

개발 기간: 2025년 12월

---

## 🔗 관련 문서

- [프로젝트 기능 상세 설명](./PROJECT_FEATURES.md)
- [배포 가이드](./DEPLOYMENT.md)
- [Railway 설정 가이드](./RAILWAY_SETUP.md)