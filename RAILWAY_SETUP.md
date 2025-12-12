# Railway 배포 설정 가이드

## 문제 해결: Nixpacks 빌드 실패

Nixpacks가 Node.js 버전을 인식하지 못하는 경우, Railway 대시보드에서 직접 설정하는 것이 가장 확실합니다.

## ✅ 추천 방법: Railway 대시보드에서 직접 설정

### Step 1: Railway 서비스 설정

1. Railway 대시보드에서 서비스 선택
2. **Settings** 탭 클릭
3. **Build & Deploy** 섹션으로 스크롤

### Step 2: 빌드 설정 입력

**Root Directory:**
```
Backend
```

**Build Command:**
```
npm install && npx prisma generate && npm run build
```

**Start Command:**
```
npx prisma migrate deploy && npm start
```

### Step 3: Node.js 버전 설정 (선택사항)

**NIXPACKS_NODE_VERSION** 환경 변수 추가:
```
NIXPACKS_NODE_VERSION=18
```

또는 Settings > Build에서 Node.js 버전 선택

### Step 4: 저장 및 재배포

1. **Save** 클릭
2. **Deploy** 탭으로 이동
3. **"Redeploy"** 버튼 클릭

---

## 대안: package.json 활용

Railway는 `package.json`의 `engines` 필드를 자동으로 인식합니다.

현재 `package.json`에 이미 설정되어 있습니다:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

이 설정만으로도 Railway가 Node.js 18을 사용합니다.

---

## 환경 변수 확인

배포 전 다음 환경 변수가 설정되어 있는지 확인:

- ✅ `DATABASE_URL` (PostgreSQL에서 자동 생성)
- ✅ `JWT_SECRET` (직접 설정 필요)
- ✅ `JWT_EXPIRES_IN=7d` (선택사항)
- ✅ `NODE_ENV=production` (선택사항)
- ✅ `CORS_ORIGIN` (프론트엔드 배포 후 설정)

---

## 빌드 실패 시 체크리스트

- [ ] Root Directory가 `Backend`로 설정되어 있는지 확인
- [ ] Build Command가 올바르게 설정되어 있는지 확인
- [ ] Start Command가 올바르게 설정되어 있는지 확인
- [ ] 환경 변수가 모두 설정되어 있는지 확인
- [ ] PostgreSQL 데이터베이스가 생성되어 있는지 확인
- [ ] GitHub에 최신 코드가 푸시되어 있는지 확인

---

## 최종 확인

배포가 성공하면:
1. **Deploy** 탭에서 "SUCCESS" 상태 확인
2. **Settings** > **Networking**에서 도메인 확인
3. `https://YOUR_URL/api/health` 접속하여 테스트

