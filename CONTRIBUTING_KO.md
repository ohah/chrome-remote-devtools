# Chrome Remote DevTools 기여하기

Chrome Remote DevTools 프로젝트에 기여해주셔서 감사합니다!

커뮤니티의 기여를 환영하며, 프로젝트 개선을 위한 노력에 감사드립니다.

## 목차

- [Code of Conduct](#code-of-conduct)
- [도움 받기](#도움-받기)
- [기여 방법](#기여-방법)
- [개발 환경 설정](#개발-환경-설정)
- [개발 서버 실행](#개발-서버-실행)
- [테스트](#테스트)
- [코드 품질 검사](#코드-품질-검사)
- [Pull Request 프로세스](#pull-request-프로세스)
- [커밋 메시지 가이드라인](#커밋-메시지-가이드라인)

## Code of Conduct

이 프로젝트는 [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/)를 준수합니다. 참여하시는 모든 분은 이 규칙을 준수해주시기 바랍니다.

## 도움 받기

프로젝트에 대한 질문이나 시작하는 데 도움이 필요하시면 [GitHub Discussions](https://github.com/ohah/chrome-remote-devtools/discussions) 페이지를 이용해주세요. 질문, 아이디어 공유, 커뮤니티와의 소통에 가장 적합한 공간입니다.

## 기여 방법

Chrome Remote DevTools에 기여하는 방법은 여러 가지가 있습니다:

- **버그 리포트**: 버그를 발견하셨다면, 명확한 설명과 재현 단계를 포함하여 [이슈를 열어주세요](https://github.com/ohah/chrome-remote-devtools/issues/new).
- **기능 제안**: 새로운 기능 아이디어가 있으시면 Discussion을 시작하거나 이슈를 열어 의견을 공유해주세요.
- **문서 개선**: 오타 수정, 예제 추가, 설명 개선 등으로 문서를 개선해주세요.
- **Pull Request 제출**: 버그 수정, 기능 추가, 기존 코드 개선을 위한 PR을 제출해주세요.

## 개발 환경 설정

Chrome Remote DevTools는 [mise](https://mise.jdx.dev/)를 사용하여 Rust와 Bun 버전을 관리하여 팀 전체에서 일관된 개발 환경을 유지합니다.

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
# 전체 패키지 빌드
bun run build
```

## DevTools Frontend 빌드

DevTools UI는 Chrome DevTools frontend의 포크를 기반으로 합니다. 빌드하려면 [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)가 설치되어 있어야 합니다.

### 사전 요구사항

1. **depot_tools 설치**: [depot_tools 설정 가이드](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)를 따라 설치하세요.

2. **PATH에 depot_tools 추가**: `gclient`, `gn`, `autoninja` 명령어를 사용할 수 있어야 합니다.

### 빌드 단계

1. **devtools 디렉토리로 이동**:

   ```bash
   cd devtools
   ```

2. **의존성 동기화**:

   ```bash
   gclient sync
   ```

   이 명령은 devtools-frontend에 필요한 모든 의존성을 다운로드합니다.

3. **빌드 설정 생성**:

   ```bash
   cd devtools-frontend
   gn gen out/Default
   ```

4. **DevTools 빌드**:

   ```bash
   autoninja -C out/Default
   ```

   또는 npm을 사용할 수도 있습니다:

   ```bash
   npm run build
   ```

5. **빌드 결과물 위치**:
   빌드된 파일은 `devtools/devtools-frontend/out/Default/gen/front_end`에 있습니다.

### 빠른 빌드 옵션

개발 중 빠른 반복을 위해 타입 체크와 번들링을 건너뛸 수 있습니다:

```bash
gn gen out/fast-build --args="devtools_skip_typecheck=true devtools_bundle=false"
autoninja -C out/fast-build
```

또는 npm으로 fast-build 타겟 사용:

```bash
npm run build -- -t fast-build
```

### 참고사항

- 첫 빌드는 의존성 다운로드와 컴파일로 인해 시간이 걸릴 수 있습니다.
- 이후 빌드는 증분 빌드로 훨씬 빠릅니다.
- 빌드는 기본적으로 `Default`를 타겟으로 사용합니다. `-t <name>`으로 다른 타겟을 지정할 수 있습니다.
- 개발 중에는 DevTools frontend 코드 자체를 수정하는 경우가 아니라면 DevTools를 다시 빌드할 필요가 없습니다.

## 개발 서버 실행

개발 중에는 각 패키지를 개별적으로 실행할 수 있습니다:

```bash
# WebSocket 중계 서버 실행
bun run dev:server

# Inspector 웹 버전 실행
bun run dev:inspector

# Inspector 데스크탑 버전 실행 (Tauri)
bun run dev:inspector:tauri

# 문서 페이지 실행
bun run dev:docs
```

### 개발 워크플로우

일반적인 개발 워크플로우:

1. **서버 실행**: `bun run dev:server`로 WebSocket 서버 시작
2. **Inspector 실행**: `bun run dev:inspector`로 웹 Inspector 실행
3. **테스트 페이지 준비**: 디버깅할 웹페이지에 클라이언트 스크립트 로드
4. **연결 확인**: Inspector에서 클라이언트 연결 및 CDP 메시지 전달 확인

## 테스트

### TypeScript/JavaScript 테스트

각 패키지별로 테스트를 실행할 수 있습니다:

```bash
# 전체 테스트 실행
bun test

# 특정 패키지 테스트
bun test packages/server
bun test packages/client
bun test packages/inspector
```

### Rust 테스트

Tauri 백엔드 및 Rust 코드 테스트:

```bash
# 전체 Rust 테스트
cargo test --all

# 특정 패키지 테스트
cargo test --package inspector
```

### 통합 테스트

전체 시스템이 올바르게 작동하는지 확인:

1. 서버 실행: `bun run dev:server`
2. Inspector 실행: `bun run dev:inspector`
3. 테스트 웹페이지에서 클라이언트 스크립트 로드
4. Inspector에서 연결 및 CDP 메시지 전달 확인

## 코딩 스타일 가이드라인

### 주석 스타일

모든 주석은 **영어와 한글을 함께** 사용합니다.

**형식**: `English description / 한글 설명`

**예시**:

```typescript
// Update connection state / 연결 상태 업데이트
function updateConnection() {
  // ...
}

// Handle WebSocket message / WebSocket 메시지 처리
async function handleMessage(msg: string) {
  // ...
}
```

**스크립트 파일 예시**:

```bash
# Install dependencies / 의존성 설치
bun install

# Build packages / 패키지 빌드
bun run build
```

**원칙**:

- 영어를 먼저 작성하고, 슬래시(`/`)로 구분한 후 한글을 작성
- 짧은 주석은 한 줄로 작성
- 긴 설명이 필요한 경우 여러 줄로 나누어 작성 가능
- 코드 자체로 명확한 경우 주석 생략 가능

## 코드 품질 검사

Pull Request를 제출하기 전에 모든 코드 품질 검사를 통과했는지 확인하세요. 로컬에서 다음 명령어를 실행하여 문제를 조기에 발견할 수 있습니다.

### TypeScript/JavaScript

- **Lint 검사**:

  ```bash
  bun run lint
  ```

- **포맷팅 검사 및 적용**:

  ```bash
  # 포맷팅 적용
  bun run format

  # 포맷팅 검사만 (CI용)
  bun run format:check
  ```

- **타입 검사**:
  ```bash
  # 각 패키지에서 타입 검사
  bun run --filter='*' typecheck
  ```

### Rust

- **Clippy (린터)**:

  ```bash
  cargo clippy --all -- --deny warnings
  ```

- **포맷팅**:

  ```bash
  # 포맷팅 적용
  bun run format:rust

  # 포맷팅 검사만
  bun run format:rust:check
  ```

- **테스트 실행**:
  ```bash
  cargo test --all
  ```

### 중요 사항

- PR을 열기 전에 로컬에서 모든 품질 검사를 실행하세요. 이렇게 하면 리뷰 프로세스가 빨라지고 CI 실패를 줄일 수 있습니다.
- CI는 빌드 프로세스와 통합 테스트를 포함한 포괄적인 검증을 실행합니다.
- 모든 검사가 통과해야 PR이 병합될 수 있습니다.

## Pull Request 프로세스

1. **저장소 포크**: GitHub에서 저장소를 포크합니다.

2. **변경사항 구현**: 버그 수정, 기능 추가, 개선사항을 구현합니다.

3. **로컬 테스트**: 위에 언급된 모든 코드 품질 검사를 실행하여 모든 것이 통과하는지 확인합니다.

4. **변경사항 커밋**: [커밋 메시지 가이드라인](#커밋-메시지-가이드라인)을 따릅니다.

5. **Push 및 Pull Request 생성**: 브랜치를 푸시하고 `main` 브랜치에 대한 PR을 엽니다.

6. **CI 승인**: PR을 열면 유지보수자가 CI 워크플로우 실행을 승인합니다.

7. **CI 검증**: CI 워크플로우는 모든 품질 검사, 빌드 프로세스, 통합 테스트를 실행합니다. PR이 병합되기 전에 모든 검사가 통과해야 합니다.

### 중요 사항

- PR을 열기 전에 로컬에서 모든 품질 검사를 실행하세요. 이렇게 하면 리뷰 프로세스가 빨라지고 CI 실패를 줄일 수 있습니다.
- CI는 빌드 프로세스와 통합 테스트를 포함한 포괄적인 검증을 실행합니다.
- 유지보수자의 피드백에 신속하게 대응하고 필요에 따라 PR을 업데이트하세요.

## 커밋 메시지 가이드라인

우리는 [Conventional Commits](https://www.conventionalcommits.org/) 사양을 따릅니다. 이를 통해 명확하고 일관된 프로젝트 히스토리를 유지할 수 있습니다.

### 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type (필수)

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `test`: 테스트 추가/수정
- `docs`: 문서 업데이트
- `chore`: 빌드 설정, 의존성 업데이트 등
- `style`: 코드 포맷팅, 세미콜론 누락 등 (기능 변경 없음)

### Scope (선택)

- `server`: 서버 패키지 관련
- `client`: 클라이언트 패키지 관련
- `inspector`: Inspector 패키지 관련
- `devtools`: devtools-frontend 관련
- `docs`: 문서 관련
- `scripts`: 빌드/초기화 스크립트 관련
- `config`: 프로젝트 설정 파일 관련

### Subject (필수)

- 50자 이내로 간결하게 작성
- 명령형으로 작성 (과거형 X)
- 첫 글자는 대문자로 시작하지 않음
- 마지막에 마침표(.) 사용하지 않음

### Body (선택)

- 72자마다 줄바꿈
- 무엇을, 왜 변경했는지 설명
- 어떻게 변경했는지는 코드로 보이므로 생략 가능

### Footer (선택)

- Breaking changes, Issue 번호 등

### 커밋 예시

```
feat(server): add WebSocket relay server

- Implement basic WebSocket server for CDP message relay
- Support multiple client connections
- Add connection state management
```

```
fix(client): handle WebSocket reconnection properly

- Fix reconnection logic when connection is lost
- Add exponential backoff for reconnection attempts
```

```
refactor(inspector): reorganize component structure

- Move DevTools integration to separate module
- Extract connection logic to custom hook
```

### 커밋 원칙

1. **단일 목적**: 하나의 커밋은 하나의 목적만 가져야 함
2. **논리적 분리**: 관련 없는 변경사항은 별도 커밋으로 분리
3. **독립적 의미**: 각 커밋은 독립적으로 의미가 있어야 함
4. **되돌리기 용이**: 특정 기능만 되돌릴 수 있도록 구성
5. **작은 단위**: 가능한 작은 단위로 커밋 (하지만 너무 작지 않게)

### 커밋 순서 예시

1. 의존성 추가
2. 타입 정의
3. 기능 구현
4. 리팩토링
5. 테스트 추가
6. 문서 업데이트

이 순서로 커밋하면 히스토리가 명확하고 이해하기 쉬워집니다.

---

Chrome Remote DevTools에 기여해주셔서 감사합니다! 여러분의 노력이 이 프로젝트를 더 나은 도구로 만들어줍니다.
