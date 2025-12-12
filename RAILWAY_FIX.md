# Railway 빌드 실패 해결 방법

"Error creating build plan with Railpack" 에러가 발생하는 경우 해결 방법입니다.

## 방법 1: Railway 대시보드에서 직접 설정 (추천)

### Step 1: Railway 설정 확인

1. Railway 대시보드에서 서비스 선택
2. **Settings** 탭 클릭
3. **Build & Deploy** 섹션으로 스크롤

### Step 2: 빌드 설정

**Root Directory:**
- `Backend` 입력

**Build Command:**
```
npm install && npx prisma generate && npm run build
```

**Start Command:**
```
npx prisma migrate deploy && npm start
```

### Step 3: 재배포

1. **Deploy** 탭으로 이동
2. **"Redeploy"** 버튼 클릭
3. 또는 GitHub에 푸시하면 자동 재배포

---

## 방법 2: nixpacks.toml 파일 사용

현재 `Backend/nixpacks.toml` 파일이 있지만, Railway가 인식하지 못할 수 있습니다.

### 확인사항:

1. 파일이 `Backend/` 폴더 루트에 있는지 확인
2. 파일 내용이 올바른지 확인
3. GitHub에 푸시되었는지 확인

### nixpacks.toml 내용:

```toml
[phases.setup]
nixPkgs = ['nodejs-20_x']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npx prisma generate', 'npm run build']

[start]
cmd = 'npx prisma migrate deploy && npm start'
```

---

## 방법 3: Dockerfile 사용 (대안)

Railway가 Nixpacks를 인식하지 못하는 경우 Dockerfile을 사용할 수 있습니다.

### Backend/Dockerfile 생성:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./
COPY prisma ./prisma/

# 의존성 설치
RUN npm ci

# Prisma 클라이언트 생성
RUN npx prisma generate

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# 마이그레이션 실행 및 서버 시작
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

그리고 Railway 설정에서:
- **Builder**: Dockerfile 선택

---

## 방법 4: package.json scripts 활용

Railway는 package.json의 scripts를 자동으로 인식할 수 있습니다.

### package.json에 추가:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "postinstall": "npx prisma generate",
    "railway": "npm run build"
  }
}
```

Railway 설정:
- **Build Command**: 비워두기 (자동 감지)
- **Start Command**: `npx prisma migrate deploy && npm start`

---

## 문제 해결 체크리스트

- [ ] Root Directory가 `Backend`로 설정되어 있는지 확인
- [ ] Build Command가 올바르게 설정되어 있는지 확인
- [ ] Start Command가 올바르게 설정되어 있는지 확인
- [ ] 환경 변수 (DATABASE_URL, JWT_SECRET 등)가 설정되어 있는지 확인
- [ ] PostgreSQL 데이터베이스가 생성되어 있는지 확인
- [ ] GitHub에 최신 코드가 푸시되어 있는지 확인

---

## 가장 확실한 방법

**Railway 대시보드에서 직접 설정하는 방법 1을 추천합니다.**

1. Settings > Build & Deploy
2. Root Directory: `Backend`
3. Build Command: `npm install && npx prisma generate && npm run build`
4. Start Command: `npx prisma migrate deploy && npm start`
5. 저장 후 재배포

이 방법이 가장 확실하게 작동합니다.

