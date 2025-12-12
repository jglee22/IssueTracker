# 🚀 외부 배포 가이드 (Railway + Vercel)

면접장 등 외부에서 접근 가능하게 배포하는 방법입니다.

---

## 📋 사전 준비

### 1. GitHub에 코드 푸시 (필수)

```bash
# Git 저장소가 없다면
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 2. JWT_SECRET 생성

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**이 값을 복사해두세요!** (나중에 사용)

---

## 1️⃣ Railway에 백엔드 배포

### Step 1: Railway 가입 및 프로젝트 생성

1. **https://railway.app** 접속
2. "Start a New Project" 클릭
3. **GitHub로 로그인**
4. "Deploy from GitHub repo" 선택
5. 저장소 선택
6. "Add Service" 클릭

### Step 2: 서비스 설정

1. 서비스 이름: `issue-tracker-backend` (또는 원하는 이름)
2. **Settings** > **Source** > **Root Directory**: `Backend` 입력
3. **Settings** > **Build & Deploy**:
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`

### Step 3: PostgreSQL 데이터베이스 추가

1. 프로젝트 페이지에서 **"New"** 버튼 클릭
2. **"Database"** > **"Add PostgreSQL"** 선택
3. 자동으로 `DATABASE_URL` 환경 변수가 생성됨 ✅

### Step 4: 환경 변수 설정

1. 백엔드 서비스 클릭
2. **"Variables"** 탭 클릭
3. 다음 환경 변수 추가:

```
PORT=5000
JWT_SECRET=(위에서 생성한 JWT_SECRET 값 붙여넣기)
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

4. **Save** 클릭

### Step 5: 배포 및 URL 확인

1. **"Deploy"** 탭에서 배포 진행 상황 확인
2. 배포 완료 후 **"Settings"** > **"Networking"** 탭
3. **"Generate Domain"** 클릭
4. 생성된 URL 확인 (예: `https://issue-tracker-backend-production.up.railway.app`)
5. **이 URL을 복사해두세요!** 📋

### Step 6: Prisma 마이그레이션 확인

배포 로그에서 확인:
- **"Deploy"** 탭 > **"View Logs"**
- `prisma migrate deploy` 성공 메시지 확인

**만약 실패했다면:**
```bash
npm install -g @railway/cli
railway login
railway link
railway run npx prisma migrate deploy
```

---

## 2️⃣ Vercel에 프론트엔드 배포

### Step 1: Vercel 가입 및 프로젝트 생성

1. **https://vercel.com** 접속
2. **GitHub로 로그인**
3. **"Add New..."** > **"Project"** 클릭
4. GitHub 저장소 선택
5. **"Import"** 클릭

### Step 2: 프로젝트 설정

1. **Framework Preset**: **Vite** 선택 (자동 감지됨)
2. **Root Directory**: `Frontend` 입력
   - "Edit" 클릭 > `Frontend` 입력
3. **Build Command**: `npm run build` (자동 감지됨)
4. **Output Directory**: `dist` (자동 감지됨)

### Step 3: 환경 변수 설정

1. **"Environment Variables"** 섹션으로 스크롤
2. **"Add"** 클릭
3. 다음 입력:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://YOUR_RAILWAY_URL/api`
     (1단계에서 복사한 Railway URL 사용)
   - **Environment**: Production, Preview, Development 모두 선택 ✅
4. **"Save"** 클릭

### Step 4: 배포

1. **"Deploy"** 버튼 클릭
2. 배포 진행 상황 확인 (약 1-2분)
3. 배포 완료 후 URL 확인
   - 예: `https://issue-tracker-abc123.vercel.app`
4. **이 URL을 복사해두세요!** 📋

---

## 3️⃣ CORS 설정 업데이트

### Railway에서 CORS_ORIGIN 추가

1. **Railway**로 돌아가기
2. 백엔드 서비스 > **"Variables"** 탭
3. 새로운 환경 변수 추가:

```
CORS_ORIGIN=https://YOUR_VERCEL_URL.vercel.app
```

(2단계에서 복사한 Vercel URL 사용)

4. **Save** 클릭
5. 자동으로 재배포됨 (또는 수동으로 "Redeploy" 클릭)

---

## 4️⃣ 최종 확인

### 백엔드 확인

1. 브라우저에서 `https://YOUR_RAILWAY_URL/api/health` 접속
2. `{"status":"ok",...}` 응답 확인 ✅

### 프론트엔드 확인

1. Vercel URL 접속: `https://YOUR_VERCEL_URL.vercel.app`
2. 페이지가 정상적으로 로드되는지 확인 ✅
3. 회원가입/로그인 테스트 ✅
4. 프로젝트 생성 테스트 ✅

---

## 🎉 완료!

이제 Vercel URL을 면접관에게 공유하세요!

---

## ❗ 문제 해결

### 백엔드 배포 실패

**Prisma 마이그레이션 실패:**
```bash
railway run npx prisma migrate deploy
```

**빌드 실패:**
- 로컬에서 `cd Backend && npm run build` 실행
- 에러 메시지 확인 및 수정

### 프론트엔드 배포 실패

**빌드 실패:**
- 로컬에서 `cd Frontend && npm run build` 실행
- TypeScript 오류 수정

**API 연결 실패:**
- `VITE_API_URL` 환경 변수가 올바른지 확인
- CORS 설정 확인
- 브라우저 콘솔에서 에러 확인

### CORS 에러

**증상:** 브라우저 콘솔에 CORS 에러
- Railway의 `CORS_ORIGIN`에 Vercel URL이 정확히 포함되어 있는지 확인
- URL에 `https://` 포함되어 있는지 확인
- 재배포 후 확인

---

## 💰 비용

### 무료 티어

- **Railway**: $5 크레딧/월 (제한적이지만 테스트/시연 충분)
- **Vercel**: 완전 무료, 제한 없음

### 유료 플랜 (필요시)

- **Railway**: $20/월부터
- **Vercel**: $20/월부터 (팀 플랜)

---

## 📝 체크리스트

배포 전:
- [ ] GitHub에 코드 푸시 완료
- [ ] JWT_SECRET 생성 완료
- [ ] 로컬에서 정상 작동 확인

배포 중:
- [ ] Railway 백엔드 배포 완료
- [ ] PostgreSQL 데이터베이스 생성 완료
- [ ] 환경 변수 설정 완료
- [ ] Prisma 마이그레이션 성공
- [ ] Vercel 프론트엔드 배포 완료
- [ ] 환경 변수 설정 완료
- [ ] CORS 설정 업데이트 완료

배포 후:
- [ ] 백엔드 Health Check 성공
- [ ] 프론트엔드 정상 로드
- [ ] 회원가입/로그인 작동
- [ ] 프로젝트 생성 작동
- [ ] 이슈 생성/수정 작동
- [ ] 파일 업로드 작동
- [ ] HTTPS 적용 확인

---

## 🔗 유용한 링크

- Railway: https://railway.app
- Vercel: https://vercel.com
- Railway CLI: https://docs.railway.app/develop/cli
- Vercel 문서: https://vercel.com/docs

