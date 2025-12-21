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

### 사전 준비

**통합 개발 환경 (`bun run dev`)의 경우**: 수동 빌드가 필요 없습니다. 클라이언트 패키지가 자동으로 watch 모드로 빌드됩니다.

**개별 서버의 경우**: 개발 서버를 실행하기 전에 클라이언트 패키지를 빌드해야 합니다:

```bash
# 클라이언트 패키지 빌드
cd packages/client
bun run build
cd ../..
```

서버가 `/client.js`에서 빌드된 클라이언트 스크립트를 제공하기 때문에 필수입니다.

### 통합 개발 환경

간소화된 개발 환경을 위해 하나의 명령어로 모든 서비스를 실행할 수 있습니다:

```bash
bun run dev
```

이 명령어는 자동으로:
- 클라이언트 패키지를 watch 모드로 빌드 (파일 변경 시 자동 재빌드)
- WebSocket 서버를 `http://localhost:8080`에서 시작
- Inspector를 `http://localhost:1420`에서 시작
- 예제 앱을 `http://localhost:5173`에서 시작

모든 서비스는 하나의 터미널에서 색상으로 구분된 로그와 함께 실행됩니다:
- `[CLIENT]` - 클라이언트 빌드 출력 (cyan)
- `[SERVER]` - 서버 로그 (green)
- `[INSPECTOR]` - Inspector 로그 (yellow)
- `[EXAMPLE]` - 예제 앱 로그 (magenta)

`Ctrl+C`를 눌러 모든 서비스를 한 번에 종료할 수 있습니다.

**참고**: 클라이언트 패키지는 자동으로 watch 모드로 빌드되므로, 클라이언트 코드를 변경할 때 수동으로 다시 빌드할 필요가 없습니다.

### 개별 서버 실행

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

### 전체 개발 워크플로우 (여러 터미널)

로그를 더 잘 구분하기 위해 여러 터미널에서 서비스를 실행하려면 개별 명령어를 사용할 수 있습니다:

**터미널 1 - WebSocket 서버**:

```bash
bun run dev:server
```

- 서버는 `http://localhost:8080`에서 실행됩니다
- WebSocket 엔드포인트 제공: `/remote/debug/client/:id` 및 `/remote/debug/devtools/:id`
- `/client.js`에서 클라이언트 스크립트 제공
- HTTP API 제공: `/json`, `/json/clients`, `/json/inspectors`

**터미널 2 - Inspector**:

```bash
bun run dev:inspector
```

- Inspector는 `http://localhost:1420`에서 실행됩니다
- 브라우저에서 자동으로 열립니다
- `localhost:8080`의 WebSocket 서버에 연결됩니다

**터미널 3 - 예제 앱 (선택사항)**:

```bash
cd examples/basic
bun run dev
```

- 예제 앱은 `http://localhost:5173`에서 실행됩니다 (5173이 사용 중이면 다른 포트)
- `http://localhost:8080/client.js`에서 클라이언트 스크립트를 자동으로 로드합니다
- 클라이언트 스크립트가 WebSocket 서버에 자동으로 연결됩니다

### 설정 테스트

1. **Inspector 열기**: 브라우저에서 `http://localhost:1420`으로 이동
2. **예제 앱 열기**: `http://localhost:5173`으로 이동 (또는 터미널에 표시된 포트)
3. **연결 확인**:
   - 예제 앱이 자동으로 클라이언트 스크립트를 로드합니다
   - Inspector UI를 확인하세요 - 드롭다운에서 연결된 클라이언트를 볼 수 있어야 합니다
   - DevTools iframe이 로드되고 클라이언트에 연결되어야 합니다

### 포트 및 엔드포인트

| 서비스         | 포트 | 엔드포인트                                                                                                                                                                                                    |
| -------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebSocket 서버 | 8080 | `ws://localhost:8080/remote/debug/client/:id`<br>`ws://localhost:8080/remote/debug/devtools/:id`<br>`http://localhost:8080/json`<br>`http://localhost:8080/json/clients`<br>`http://localhost:8080/client.js` |
| Inspector      | 1420 | `http://localhost:1420`                                                                                                                                                                                       |
| 예제 앱        | 5173 | `http://localhost:5173` (기본 Vite 포트)                                                                                                                                                                      |

### 문제 해결

#### 클라이언트 스크립트를 찾을 수 없음

`/client.js`를 찾을 수 없다는 오류가 발생하면:

1. **클라이언트 패키지 빌드**:

   ```bash
   cd packages/client
   bun run build
   ```

2. **파일 존재 확인**:

   ```bash
   ls packages/client/dist/index.js
   ```

3. **빌드 후 서버 재시작**:
   ```bash
   bun run dev:server
   ```

#### 포트 충돌

포트 8080 또는 1420이 이미 사용 중이면:

- **서버 포트 변경**: `PORT` 환경 변수 설정:

  ```bash
  PORT=8081 bun run dev:server
  ```

- **Inspector 포트 변경**: `packages/inspector/vite.config.ts`에서 포트 수정

#### WebSocket 연결 실패

클라이언트가 서버에 연결할 수 없으면:

1. **서버 실행 확인**: `bun run dev:server`가 실행 중인지 확인
2. **서버 URL 확인**: 클라이언트 스크립트가 올바른 서버 URL을 사용하는지 확인
3. **브라우저 콘솔 확인**: WebSocket 연결 오류를 찾아보세요
4. **CORS 확인**: 서버가 클라이언트 출처에서 연결을 허용해야 합니다

### 개발 워크플로우

**권장 워크플로우 (통합)**:

1. **모든 서비스 시작**: `bun run dev` (단일 터미널)
2. **변경사항 적용**: 모든 패키지에서 코드 편집
3. **변경사항 테스트**: 브라우저를 새로고침하고 기능 확인
4. **연결 확인**: Inspector에서 연결된 클라이언트와 CDP 메시지 확인

**대안 워크플로우 (별도 터미널)**:

1. **클라이언트 빌드**: `cd packages/client && bun run build && cd ../..`
2. **서버 시작**: `bun run dev:server` (터미널 1)
3. **Inspector 시작**: `bun run dev:inspector` (터미널 2)
4. **예제 앱 시작** (선택사항): `cd examples/basic && bun run dev` (터미널 3)
5. **변경사항 적용**: 모든 패키지에서 코드 편집
6. **변경사항 테스트**: 브라우저를 새로고침하고 기능 확인
7. **연결 확인**: Inspector에서 연결된 클라이언트와 CDP 메시지 확인

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

통합 테스트는 Playwright를 사용하여 전체 시스템을 엔드투엔드로 테스트합니다:

```bash
# 통합 테스트 실행
bun run test:e2e:integration

# UI 모드로 실행 (대화형)
bun run test:e2e:integration:ui

# 디버그 모드로 실행
bun run test:e2e:integration:debug
```

**통합 테스트 작동 방식**:

1. **자동 서버 시작**: Playwright 설정이 테스트 전에 WebSocket 서버를 자동으로 시작합니다
2. **브라우저 자동화**: 테스트는 Playwright를 사용하여 브라우저를 열고 테스트 페이지를 로드합니다
3. **WebSocket 연결**: 테스트는 클라이언트 및 Inspector 연결을 시뮬레이션합니다
4. **CDP 메시지 검증**: 테스트는 CDP 메시지가 올바르게 중계되는지 확인합니다

**통합 테스트 사전 준비**:

- **클라이언트 패키지 빌드**: 서버에 빌드된 클라이언트 스크립트가 필요합니다:

  ```bash
  cd packages/client
  bun run build
  ```

- **Playwright 브라우저 설치** (아직 설치하지 않은 경우):
  ```bash
  npx playwright install
  ```

**참고**: 통합 테스트는 현재 최소한(헬로우월드 테스트)입니다. 더 포괄적인 테스트가 계획되어 있습니다.

### 수동 통합 테스트

전체 시스템의 수동 테스트를 위해:

1. **클라이언트 빌드**: `cd packages/client && bun run build && cd ../..`
2. **서버 시작**: `bun run dev:server`
3. **Inspector 시작**: `bun run dev:inspector`
4. **테스트 웹페이지에 클라이언트 스크립트 로드**:
   - 브라우저에서 웹페이지를 엽니다
   - HTML에 다음 스크립트 태그를 추가합니다:
     ```html
     <script src="http://localhost:8080/client.js" data-server-url="http://localhost:8080"></script>
     ```
5. **연결 확인**:
   - `http://localhost:1420`에서 Inspector 확인
   - 드롭다운에서 연결된 클라이언트를 볼 수 있어야 합니다
   - DevTools iframe이 로드되고 연결되어야 합니다
   - Console 패널에서 JavaScript 실행 시도
   - Network 패널에서 네트워크 요청 확인

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
