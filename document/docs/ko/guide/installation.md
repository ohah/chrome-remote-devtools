# 설치

## 사전 요구사항

Chrome Remote DevTools를 설치하기 전에 다음이 설치되어 있는지 확인하세요:

- [Bun](https://bun.sh) (최신 버전)
- [Rust](https://www.rust-lang.org/) (안정 버전)
- [mise](https://mise.jdx.dev/) (도구 버전 관리용)
- Git

## 설치 단계

### 1. 저장소 클론

```bash
git clone https://github.com/ohah/chrome-remote-devtools.git
cd chrome-remote-devtools
```

### 2. 프로젝트 초기화

초기화 스크립트를 실행하여 의존성 및 참조 저장소를 설정합니다:

```bash
# OS를 자동으로 감지하고 적절한 스크립트 실행
bun run init

# 또는 수동으로:
# Windows:
scripts\init.bat

# Linux/macOS:
bash scripts/init.sh
```

이 작업은 다음을 수행합니다:
- Bun 의존성 설치
- Rust 의존성 설치
- 참조 저장소 클론 (chii, chobitsu, devtools-remote-debugger, devtools-protocol, rrweb)

### 3. 설치 확인

```bash
# Bun 버전 확인
bun --version

# Rust 버전 확인
rustc --version
```

## 다음 단계

설치가 완료되면 [빠른 시작 가이드](/ko/guide/quick-start)로 진행하여 Chrome Remote DevTools 사용을 시작하세요.
