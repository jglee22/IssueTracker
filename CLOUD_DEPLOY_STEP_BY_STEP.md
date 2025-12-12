# 클라우드 배포 단계별 가이드

Railway(백엔드) + Vercel(프론트엔드) 조합으로 배포합니다.

---

## 사전 준비

### 1. GitHub에 코드 푸시
```bash
# Git 저장소가 없다면
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. JWT_SECRET 생성
```bash
# Node.js에서 실행
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
이 값을 복사해두세요 (나중에 사용)

---

## 1단계: Railway에 백엔드 배포

### 1-1. Railway 가입 및 프로젝트 생성

1. **Railway 가입**
   - https://railway.app 접속
   - "Start a New Project" 클릭
   - GitHub 계정으로 로그인

2. **프로젝트 생성**
   - "Deploy from GitHub repo" 선택
   - 저장소 선택
   - "Add Service" 클릭

3. **서비스 설정**
   - Service 이름: `issue-tracker-backend` (또는 원하는 이름)
   - Root Directory: `Backend` 설정
     - Settings > Source > Root Directory: `Backend`

### 1-2. PostgreSQL 데이터베이스 추가

1. **데이터베이스 생성**
   - 프로젝트 페이지에서 "New" 버튼 클릭
   - "Database" > "Add PostgreSQL" 선택
   - 자동으로 `DATABASE_URL` 환경 변수가 생성됨

### 1-3. 환경 변수 설정

1. **백엔드 서비스 선택**
   - 프로젝트에서 백엔드 서비스 클릭
   - "Variables" 탭 클릭

2. **환경 변수 추가**
   ```
   PORT=5000
   JWT_SECRET=위에서_생성한_JWT_SECRET_값_붙여넣기
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   ```
   (CORS_ORIGIN은 프론트엔드 배포 후 추가)

### 1-4. 빌드 및 배포 설정

1. **Settings > Build & Deploy 설정**
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`

2. **배포 시작**
   - "Deploy" 탭에서 자동으로 배포 시작
   - 배포 완료까지 대기 (약 2-3분)

3. **배포 URL 확인**
   - "Settings" > "Networking" 탭
   - "Generate Domain" 클릭
   - 생성된 URL 확인 (예: `https://issue-tracker-backend-production.up.railway.app`)
   - 이 URL을 복사해두세요

### 1-5. Prisma 마이그레이션 확인

배포 로그에서 Prisma 마이그레이션이 성공했는지 확인:
- "Deploy" 탭 > "View Logs"
- `prisma migrate deploy` 성공 메시지 확인

만약 실패했다면:
- Railway CLI 사용:
  ```bash
  npm install -g @railway/cli
  railway login
  railway link
  railway run npx prisma migrate deploy
  ```

---

## 2단계: Vercel에 프론트엔드 배포

### 2-1. Vercel 가입 및 프로젝트 생성

1. **Vercel 가입**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 생성**
   - "Add New..." > "Project" 클릭
   - GitHub 저장소 선택
   - "Import" 클릭

### 2-2. 빌드 설정

1. **프로젝트 설정**
   - Framework Preset: **Vite** 선택
   - Root Directory: `Frontend` 설정
     - "Edit" 클릭 > `Frontend` 입력

2. **빌드 설정**
   - Build Command: `npm run build` (자동 감지됨)
   - Output Directory: `dist` (자동 감지됨)
   - Install Command: `npm install` (자동 감지됨)

### 2-3. 환경 변수 설정

1. **Environment Variables 추가**
   - "Environment Variables" 섹션에서
   - Name: `VITE_API_URL`
   - Value: `https://YOUR_RAILWAY_URL/api`
     (1단계에서 복사한 Railway URL 사용)
   - Environment: Production, Preview, Development 모두 선택
   - "Save" 클릭

### 2-4. 배포

1. **Deploy 클릭**
   - 배포 시작 (약 1-2분)

2. **배포 URL 확인**
   - 배포 완료 후 URL 확인
   - 예: `https://issue-tracker-abc123.vercel.app`
   - 이 URL을 복사해두세요

---

## 3단계: CORS 설정 업데이트

### 3-1. Railway에서 CORS_ORIGIN 추가

1. **Railway로 돌아가기**
   - 백엔드 서비스 > "Variables" 탭

2. **CORS_ORIGIN 추가**
   ```
   CORS_ORIGIN=https://YOUR_VERCEL_URL.vercel.app
   ```
   (2단계에서 복사한 Vercel URL 사용)

3. **재배포**
   - 환경 변수 저장 시 자동으로 재배포됨
   - 또는 "Deploy" 탭에서 "Redeploy" 클릭

---

## 4단계: 최종 확인

### 4-1. 백엔드 확인

1. **Health Check**
   - 브라우저에서 `https://YOUR_RAILWAY_URL/api/health` 접속
   - `{"status":"ok",...}` 응답 확인

2. **데이터베이스 확인**
   - `https://YOUR_RAILWAY_URL/api/db/tables` 접속
   - 테이블 목록 확인

### 4-2. 프론트엔드 확인

1. **Vercel URL 접속**
   - `https://YOUR_VERCEL_URL.vercel.app` 접속
   - 페이지가 정상적으로 로드되는지 확인

2. **기능 테스트**
   - 회원가입/로그인 테스트
   - 프로젝트 생성 테스트
   - 이슈 생성 테스트

---

## 문제 해결

### 백엔드 배포 실패

**문제: Prisma 마이그레이션 실패**
```bash
# Railway CLI로 수동 실행
railway run npx prisma migrate deploy
```

**문제: 빌드 실패**
- 배포 로그 확인
- 로컬에서 `npm run build` 성공하는지 확인
- `package.json`의 scripts 확인

### 프론트엔드 배포 실패

**문제: 빌드 실패**
- 로컬에서 `cd Frontend && npm run build` 실행
- 에러 메시지 확인
- TypeScript 오류 수정

**문제: API 연결 실패**
- `VITE_API_URL` 환경 변수가 올바른지 확인
- CORS 설정 확인
- 브라우저 콘솔에서 에러 확인

### CORS 에러

**증상: 브라우저 콘솔에 CORS 에러**
- Railway의 `CORS_ORIGIN`에 Vercel URL이 정확히 포함되어 있는지 확인
- URL에 `https://` 포함되어 있는지 확인
- 재배포 후 확인

### 데이터베이스 연결 실패

**증상: 500 에러 또는 DB 연결 실패**
- Railway의 `DATABASE_URL` 환경 변수 확인
- PostgreSQL 서비스가 실행 중인지 확인
- Prisma 마이그레이션이 완료되었는지 확인

---

## 추가 설정 (선택사항)

### 커스텀 도메인

**Vercel:**
- Settings > Domains에서 도메인 추가
- DNS 설정 필요

**Railway:**
- Settings > Networking에서 커스텀 도메인 추가
- DNS 설정 필요

### 환경 변수 관리

**개발 환경:**
- 로컬 `.env` 파일 사용

**프로덕션 환경:**
- Railway/Vercel의 Environment Variables 사용
- 절대 `.env` 파일을 Git에 커밋하지 마세요

---

## 비용

### 무료 티어

**Railway:**
- $5 크레딧/월 (제한적)
- PostgreSQL 포함
- 충분히 테스트/시연 가능

**Vercel:**
- 완전 무료
- 제한 없음
- HTTPS 자동 제공

### 유료 플랜 (필요시)

- Railway: $20/월부터
- Vercel: $20/월부터 (팀 플랜)

---

## 배포 완료 후

✅ **체크리스트:**
- [ ] 백엔드 Health Check 성공
- [ ] 프론트엔드 정상 로드
- [ ] 회원가입/로그인 작동
- [ ] 프로젝트 생성 작동
- [ ] 이슈 생성/수정 작동
- [ ] 파일 업로드 작동
- [ ] HTTPS 적용 확인

🎉 **완료!** 이제 Vercel URL을 면접관에게 공유하세요!

