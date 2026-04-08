---
name: cloudflare-tunnel-deploy
description: "바다거북스프 배포 스킬. Ollama 로컬 서버 설정, Cloudflare Tunnel(cloudflared) 구성, 환경변수 설정. 배포, 외부 접속 설정, Cloudflare Tunnel 요청 시 반드시 이 스킬을 사용할 것."
---

# Cloudflare Tunnel 배포

## 아키텍처
```
외부 사용자 → Cloudflare Tunnel → localhost:3000 (Next.js) → localhost:11434 (Ollama)
```
별도 클라우드 서버 없음. 내 PC가 서버 역할.

## 배포 체크리스트

### Step 0: Ollama 준비
```bash
ollama --version          # 설치 확인
ollama pull llama3.2:3b   # 판정/힌트 모델
ollama pull gemma3:12b    # 생성/평가 모델
ollama serve              # 서버 실행 (백그라운드)
curl http://localhost:11434/api/tags  # 동작 확인
```

### Step 1: 환경변수 설정
`.env.local` 생성:
```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
```

### Step 2: Next.js 빌드 및 실행
```bash
npm install
npm run build
npm start        # localhost:3000
```

### Step 3: Cloudflare Tunnel
```bash
# cloudflared 설치 후:
cloudflared tunnel login
cloudflared tunnel create sea-turtle
cloudflared tunnel route dns sea-turtle <subdomain>
cloudflared tunnel run --url http://localhost:3000 sea-turtle
```

또는 임시 터널 (개발용):
```bash
cloudflared tunnel --url http://localhost:3000
```

## 산출물
- `_workspace/04_deploy/checklist.md` — 체크리스트 + 명령어
- `.env.local.example` — 환경변수 템플릿 (실제 값 없이)
