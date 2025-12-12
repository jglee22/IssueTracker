# Railway 빌드 실패 빠른 해결 방법

## 현재 문제
`nodejs-20_x` 변수를 찾을 수 없다는 에러가 발생합니다.

## 해결 방법

### 방법 1: Railway 대시보드에서 직접 설정 (가장 확실함)

1. **Railway 대시보드 접속**
   - 서비스 선택
   - **Settings** 탭 클릭

2. **Build & Deploy 설정**
   - **Root Directory**: `Backend`
   - **Build Command**: 
     ```
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```
     npx prisma migrate deploy && npm start
     ```

3. **Node.js 버전 명시 (선택사항)**
   - **Variables** 탭으로 이동
   - 다음 환경 변수 추가:
     ```
     NIXPACKS_NODE_VERSION=18
     ```
   - 또는 Settings > Build에서 Node.js 버전 선택

4. **저장 및 재배포**
   - **Save** 클릭
   - **Deploy** 탭 > **"Redeploy"** 클릭

---

### 방법 2: GitHub에 최신 코드 푸시

`nixpacks.toml` 파일을 삭제했으므로, 변경사항을 푸시해야 합니다:

```bash
git add .
git commit -m "fix: nixpacks.toml 제거 및 Node.js 버전 설정"
git push
```

Railway가 자동으로 재배포를 시작합니다.

---

### 방법 3: Railway 빌드 캐시 클리어

Railway가 이전 빌드 설정을 캐시하고 있을 수 있습니다:

1. **Settings** > **Build & Deploy**
2. **"Clear Build Cache"** 버튼 클릭 (있는 경우)
3. 또는 서비스를 삭제하고 다시 생성

---

## 확인사항

✅ `Backend/.node-version` 파일이 `18`로 설정되어 있는지 확인
✅ `Backend/package.json`의 `engines.node`가 `>=18.0.0`인지 확인
✅ `Backend/nixpacks.toml` 파일이 삭제되었는지 확인
✅ GitHub에 최신 코드가 푸시되었는지 확인

---

## 가장 확실한 방법

**Railway 대시보드에서 Build Command와 Start Command를 직접 설정하는 것이 가장 확실합니다.**

이렇게 하면 Nixpacks 자동 감지에 의존하지 않고, 명시적으로 빌드 과정을 제어할 수 있습니다.

