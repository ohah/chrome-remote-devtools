# 개발

이 가이드는 Chrome Remote DevTools의 개발 환경 설정 및 빌드 프로세스를 다룹니다.

## 개발 명령어

```bash
# 통합 개발 환경 (서버 + Inspector 웹)
bun dev                     # 서버와 Inspector 웹을 함께 실행

# 개별 개발 서버
bun run dev:server          # WebSocket 서버만
bun run dev:inspector       # Inspector 웹만
bun run dev:inspector:tauri  # Inspector 데스크탑
bun run dev:docs            # 문서 사이트

# 코드 품질
bun run lint                # oxlint 실행
bun run format              # oxfmt로 포맷팅
bun run format:rust         # rustfmt로 Rust 코드 포맷팅

# 빌드
bun run build               # 모든 패키지 빌드
```

## DevTools 프론트엔드 빌드

DevTools UI는 Chrome DevTools frontend의 포크를 기반으로 합니다. 빌드하려면 [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)가 설치되어 있어야 합니다.

### 사전 요구사항

1. **depot_tools 설치**: [depot_tools 설정 가이드](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)를 따르세요.

2. **depot_tools가 PATH에 있는지 확인**: `gclient`, `gn`, `autoninja` 명령어를 사용할 수 있어야 합니다.

### 빌드 단계

1. **devtools 디렉토리로 이동**:

   ```bash
   cd devtools
   ```

2. **의존성 동기화**:

   ```bash
   gclient sync
   ```

   이렇게 하면 devtools-frontend에 필요한 모든 의존성이 다운로드됩니다.

3. **빌드 구성 생성**:

   ```bash
   cd devtools-frontend
   gn gen out/Default
   ```

4. **DevTools 빌드**:

   ```bash
   autoninja -C out/Default
   ```

   또는 npm을 사용할 수 있습니다:

   ```bash
   npm run build
   ```

5. **빌드 아티팩트 위치**:
   빌드된 파일은 `devtools/devtools-frontend/out/Default/gen/front_end`에 있습니다.

### 빠른 빌드 옵션

개발 중 더 빠른 반복을 위해 타입 체크 및 번들링을 건너뛸 수 있습니다:

```bash
gn gen out/fast-build --args="devtools_skip_typecheck=true devtools_bundle=false"
autoninja -C out/fast-build
```

또는 fast-build 타겟과 함께 npm 사용:

```bash
npm run build -- -t fast-build
```

### 참고사항

- 첫 빌드는 의존성을 다운로드하고 모든 것을 컴파일하므로 시간이 걸릴 수 있습니다.
- 후속 빌드는 증분 방식이며 훨씬 빠릅니다.
- 빌드는 기본적으로 `Default`를 타겟으로 사용합니다. `-t <name>`으로 다른 타겟을 지정할 수 있습니다.
- 개발 중에는 DevTools frontend 코드 자체를 수정하지 않는 한 DevTools를 다시 빌드할 필요가 없습니다.

## 서버 로그 구성

서버 로그는 기본적으로 **비활성화**되어 있어 콘솔 노이즈를 줄입니다. 환경 변수를 사용하여 활성화합니다:

```bash
# 모든 로그 활성화
LOG_ENABLED=true bun run dev:server

# 특정 CDP 메서드로 로그 필터링
LOG_ENABLED=true LOG_METHODS=Runtime.consoleAPICalled,Network.requestWillBeSent bun run dev:server
```

**참고**: 로그는 프로덕션 빌드에서 자동으로 비활성화됩니다.
