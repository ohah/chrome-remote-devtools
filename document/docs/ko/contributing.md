# 기여하기

Chrome Remote DevTools에 기여해 주셔서 감사합니다!

우리는 커뮤니티의 기여를 환영하며 이 프로젝트를 개선하는 데 도움을 주시는 노력에 감사드립니다.

## 기여 방법

기여할 수 있는 방법은 여러 가지가 있습니다:

- **버그 보고**: 명확한 설명과 함께 [이슈 열기](https://github.com/ohah/chrome-remote-devtools/issues/new)
- **기능 제안**: 토론을 시작하거나 이슈 열기
- **문서 개선**: 오타 수정, 예제 추가, 지침 명확화
- **Pull Request 제출**: 버그 수정, 기능 추가, 기존 코드 개선

## 개발 환경 설정

### 1. 프로젝트 설정

```bash
# mise 신뢰 및 도구 설치
mise trust
mise install
```

### 2. 의존성 설치

```bash
# Bun 워크스페이스 의존성 설치
bun install
```

### 3. 프로젝트 빌드

```bash
# 모든 패키지 빌드
bun run build
```

## 코드 품질

### 린팅

```bash
bun run lint
```

### 포맷팅

```bash
# TypeScript/JavaScript 포맷팅
bun run format

# Rust 코드 포맷팅
bun run format:rust
```

## 커밋 메시지 가이드라인

컨벤셔널 커밋 형식을 따릅니다:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 타입

- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링
- `test`: 테스트 변경
- `docs`: 문서 변경
- `chore`: 빌드/설정 변경

### 예제

```
feat(server): add client connection timeout

- Implement 30-second timeout for client connections
- Add connection state tracking
- Update error handling
```

## Pull Request 프로세스

1. 저장소 포크
2. 기능 브랜치 생성
3. 변경 사항 작성
4. 테스트 및 린팅 실행
5. 명확한 설명과 함께 Pull Request 제출

## 도움 받기

- [GitHub Discussions](https://github.com/ohah/chrome-remote-devtools/discussions)
- [GitHub Issues](https://github.com/ohah/chrome-remote-devtools/issues)
