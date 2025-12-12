# 면접 시연용 빠른 배포 가이드

면접장 등 외부에서 접근 가능하게 설정하는 방법입니다.

## 방법 1: ngrok 사용 (가장 빠름, 5분 이내) ⚡

### 장점
- 설정이 매우 간단
- 5분 이내 완료
- HTTPS 자동 제공
- 무료

### 단점
- 무료 버전은 URL이 매번 변경됨
- 세션이 끊기면 재연결 필요

### 설정 방법

1. **ngrok 다운로드 및 설치**
   - https://ngrok.com/download
   - Windows: 다운로드 후 압축 해제
   - 계정 생성 (무료)

2. **인증 토큰 설정**
   ```bash
   # ngrok 다운로드 폴더에서
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

3. **백엔드 터널 생성**
   ```bash
   # 백엔드가 localhost:5000에서 실행 중일 때
   ngrok http 5000
   ```
   
   출력 예시:
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:5000
   ```

4. **프론트엔드 터널 생성** (새 터미널)
   ```bash
   # 프론트엔드가 localhost:3000에서 실행 중일 때
   ngrok http 3000
   ```
   
   출력 예시:
   ```
   Forwarding  https://xyz789.ngrok-free.app -> http://localhost:3000
   ```

5. **환경 변수 설정**

   `Backend/.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://xyz789.ngrok-free.app
   ```

   `Frontend/.env`:
   ```env
   VITE_API_URL=https://abc123.ngrok-free.app/api
   ```

6. **서버 재시작**
   ```bash
   # 백엔드 재시작
   cd Backend
   npm run dev

   # 프론트엔드 재시작
   cd Frontend
   npm run dev
   ```

7. **접속**
   - 프론트엔드 ngrok URL로 접속: `https://xyz789.ngrok-free.app`
   - 이 URL을 면접관에게 공유

### ngrok 고정 URL 사용 (유료, 선택사항)

무료 버전은 URL이 매번 바뀌지만, 유료 플랜($8/월)으로 고정 URL을 사용할 수 있습니다.

---

## 방법 2: 클라우드 배포 (더 안정적, 30분 이내) 🚀

### 장점
- URL이 고정됨
- 24시간 접근 가능
- 더 안정적
- HTTPS 자동 제공

### 단점
- 설정이 조금 더 복잡
- 시간이 더 걸림

### Railway + Vercel 배포

#### 1단계: 백엔드 배포 (Railway)

1. **Railway 가입**
   - https://railway.app
   - GitHub 계정으로 로그인

2. **프로젝트 생성**
   - New Project > Deploy from GitHub repo
   - 저장소 선택
   - Root Directory: `Backend` 설정

3. **PostgreSQL 데이터베이스 추가**
   - New > Database > PostgreSQL
   - 자동으로 `DATABASE_URL` 환경 변수 생성됨

4. **환경 변수 설정**
   - Variables 탭에서 추가:
   ```
   PORT=5000
   JWT_SECRET=면접시연용-강력한-비밀번호-여기에-입력
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-app.vercel.app
   ```
   (CORS_ORIGIN은 프론트엔드 배포 후 업데이트)

5. **배포 대기**
   - 자동으로 배포 시작
   - 배포 완료 후 URL 확인 (예: `https://your-app.railway.app`)

6. **Prisma 마이그레이션**
   - 배포 로그에서 "Deploy" 탭 확인
   - 또는 Railway CLI 사용:
   ```bash
   npm install -g @railway/cli
   railway login
   railway link
   railway run npx prisma migrate deploy
   ```

#### 2단계: 프론트엔드 배포 (Vercel)

1. **Vercel 가입**
   - https://vercel.com
   - GitHub 계정으로 로그인

2. **프로젝트 생성**
   - Add New > Project
   - GitHub 저장소 선택
   - Framework Preset: Vite
   - Root Directory: `Frontend` 설정

3. **빌드 설정**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **환경 변수 설정**
   ```
   VITE_API_URL=https://your-app.railway.app/api
   ```

5. **배포**
   - Deploy 클릭
   - 배포 완료 후 URL 확인 (예: `https://your-app.vercel.app`)

6. **백엔드 CORS 업데이트**
   - Railway에서 `CORS_ORIGIN` 환경 변수를 Vercel URL로 업데이트
   - 재배포 자동 실행

#### 3단계: 접속

- Vercel URL로 접속: `https://your-app.vercel.app`
- 이 URL을 면접관에게 공유

---

## 방법 3: Render 사용 (무료 티어)

### 백엔드 (Render)

1. https://render.com 가입
2. New > Web Service
3. GitHub 저장소 연결
4. 설정:
   - Name: `issue-tracker-backend`
   - Root Directory: `Backend`
   - Environment: `Node`
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
5. PostgreSQL 데이터베이스 생성 (New > PostgreSQL)
6. 환경 변수:
   ```
   DATABASE_URL=(Render에서 제공)
   PORT=5000
   JWT_SECRET=강력한-비밀번호
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend.onrender.com
   ```

### 프론트엔드 (Render)

1. New > Static Site
2. GitHub 저장소 연결
3. 설정:
   - Root Directory: `Frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. 환경 변수:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

---

## 추천 방법

### 면접 전날 미리 준비: 클라우드 배포 (Railway + Vercel)
- 안정적이고 URL이 고정됨
- 면접 당일 걱정 없음

### 당일 급하게 필요: ngrok
- 5분 이내 설정 가능
- 빠른 테스트에 적합

---

## 체크리스트

### 배포 전 확인사항

- [ ] `Backend/.env`에 `JWT_SECRET` 설정되어 있는지 확인
- [ ] 데이터베이스 마이그레이션이 완료되었는지 확인
- [ ] 로컬에서 정상 작동하는지 확인
- [ ] 환경 변수가 올바르게 설정되었는지 확인

### 배포 후 확인사항

- [ ] 백엔드 API가 정상 작동하는지 확인 (`/api/health`)
- [ ] 프론트엔드가 백엔드에 연결되는지 확인
- [ ] 로그인/회원가입이 작동하는지 확인
- [ ] HTTPS가 적용되었는지 확인

---

## 문제 해결

### CORS 에러
- 백엔드 `CORS_ORIGIN`에 프론트엔드 URL이 포함되어 있는지 확인
- URL에 `https://` 포함되어 있는지 확인

### 데이터베이스 연결 실패
- `DATABASE_URL`이 올바른지 확인
- Prisma 마이그레이션이 실행되었는지 확인

### 빌드 실패
- 로컬에서 `npm run build`가 성공하는지 확인
- 환경 변수가 올바르게 설정되었는지 확인

