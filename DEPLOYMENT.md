# 외부 접근 및 배포 가이드

이 문서는 Issue Tracker를 외부에서 접근 가능하게 설정하는 방법을 설명합니다.

## 옵션 1: 로컬 네트워크에서 접근 (같은 WiFi)

같은 네트워크에 있는 다른 기기에서 접근하려면:

### 1. 백엔드 설정

`Backend/.env` 파일에 다음을 추가/수정:

```env
PORT=5000
# CORS 설정에 로컬 IP 주소 추가
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://YOUR_LOCAL_IP:3000
```

### 2. 프론트엔드 설정

`Frontend/.env` 파일 생성:

```env
VITE_API_URL=http://YOUR_LOCAL_IP:5000/api
```

### 3. 로컬 IP 주소 확인

**Windows:**
```powershell
ipconfig
# IPv4 주소 확인 (예: 192.168.0.100)
```

**Mac/Linux:**
```bash
ifconfig
# 또는
ip addr show
```

### 4. 방화벽 설정

**Windows:**
- Windows Defender 방화벽에서 포트 5000, 3000 허용
- 또는 개발 모드에서는 방화벽을 일시적으로 비활성화

**Mac:**
- 시스템 설정 > 네트워크 > 방화벽에서 Node.js 허용

### 5. 서버 실행

```bash
# 백엔드
cd Backend
npm run dev

# 프론트엔드
cd Frontend
npm run dev
```

다른 기기에서 `http://YOUR_LOCAL_IP:3000` 접속

---

## 옵션 2: 클라우드 배포 (추천)

### 2-1. Vercel + Railway (무료 티어)

#### 백엔드 배포 (Railway)

1. [Railway](https://railway.app) 가입
2. New Project > Deploy from GitHub repo 선택
3. Backend 폴더 선택
4. 환경 변수 설정:
   ```
   PORT=5000
   DATABASE_URL=railway에서 제공하는 PostgreSQL URL
   JWT_SECRET=강력한-랜덤-문자열
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   ```
5. Deploy

#### 프론트엔드 배포 (Vercel)

1. [Vercel](https://vercel.com) 가입
2. New Project > GitHub repo 선택
3. Root Directory를 `Frontend`로 설정
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
7. Deploy

### 2-2. Render (무료 티어)

#### 백엔드 배포

1. [Render](https://render.com) 가입
2. New > Web Service
3. GitHub repo 연결
4. 설정:
   - Root Directory: `Backend`
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
5. 환경 변수 설정 (Railway와 동일)
6. PostgreSQL 데이터베이스 생성 (Render에서 제공)

#### 프론트엔드 배포

1. New > Static Site
2. Root Directory: `Frontend`
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Environment Variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

### 2-3. AWS / Google Cloud / Azure

더 복잡하지만 더 많은 제어권이 필요하면 클라우드 제공업체를 사용할 수 있습니다.

---

## 옵션 3: 포트 포워딩 (공유기 설정)

⚠️ **보안 위험**: 이 방법은 보안에 취약하므로 개발/테스트 목적으로만 사용하세요.

1. 공유기 관리 페이지 접속 (보통 192.168.0.1)
2. 포트 포워딩 설정:
   - 외부 포트: 5000 → 내부 IP: YOUR_LOCAL_IP, 내부 포트: 5000
   - 외부 포트: 3000 → 내부 IP: YOUR_LOCAL_IP, 내부 포트: 3000
3. 공인 IP 주소 확인: https://whatismyipaddress.com
4. 외부에서 접속: `http://YOUR_PUBLIC_IP:3000`

---

## 프로덕션 환경 설정 체크리스트

### 보안 설정

1. **강력한 JWT_SECRET 사용**
   ```bash
   # Node.js에서 생성
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **HTTPS 사용** (클라우드 배포 시 자동 제공)

3. **환경 변수 보호**
   - `.env` 파일을 절대 Git에 커밋하지 않기
   - 프로덕션 환경 변수는 배포 플랫폼에서 설정

4. **CORS 제한**
   ```env
   # 프로덕션에서는 특정 도메인만 허용
   CORS_ORIGIN=https://yourdomain.com
   ```

5. **데이터베이스 보안**
   - 프로덕션 DB 비밀번호는 강력하게 설정
   - 외부 접근 제한 (가능한 경우)

### 성능 최적화

1. **프론트엔드 빌드**
   ```bash
   cd Frontend
   npm run build
   ```

2. **백엔드 프로덕션 모드**
   ```bash
   cd Backend
   npm run build
   npm start
   ```

3. **환경 변수 설정**
   ```env
   NODE_ENV=production
   ```

---

## 빠른 테스트: ngrok 사용

임시로 외부 접근을 테스트하려면 [ngrok](https://ngrok.com) 사용:

```bash
# ngrok 설치 후
ngrok http 3000
# 또는 백엔드만
ngrok http 5000
```

ngrok이 제공하는 URL로 외부에서 접근 가능합니다.

---

## 문제 해결

### CORS 에러
- `CORS_ORIGIN` 환경 변수에 접속하려는 도메인을 추가했는지 확인

### 연결 실패
- 방화벽 설정 확인
- 포트가 올바르게 열려있는지 확인
- 백엔드/프론트엔드 서버가 실행 중인지 확인

### 데이터베이스 연결 실패
- `DATABASE_URL`이 올바른지 확인
- 클라우드 DB의 경우 외부 접근 허용 설정 확인

