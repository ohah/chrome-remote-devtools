# Console timeline log still appearing (Metro) / 콘솔 타임라인 로그가 여전히 나올 때

"Waiting for Paint … Blocking Scheduler ⚛ secondary-light" 같은 로그는 **콘솔 훅이 `console.timeStamp` 등을 CDP로 보내고, DevTools가 타임라인/확장 팔레트(예: secondary-light)로 표시할 때** 보입니다. Metro 모드에서는 훅을 끄도록 수정했지만, 여전히 나온다면 아래를 순서대로 확인하세요.

## Possible causes / 가능한 원인

### 1. Build / cache not updated

- **앱·번들이 갱신되지 않음**  
  수정한 `enableHooks: !isMetroMode`가 반영되려면 **앱을 다시 빌드**하고, **Metro는 `--reset-cache`로 재시작**한 뒤 새로 연결해야 합니다.
- **이전 번들 사용**  
  디버그 빌드에서도 오래된 번들을 쓰고 있으면, 예전처럼 `connect()` 안에서 항상 훅이 켜진 상태로 동작할 수 있습니다.

### 2. Metro not detected (`enableHooks` stays true)

- **`detectMetroMode()`가 `false`를 반환하는 경우**  
  훅이 계속 켜지므로, 우리 훅을 타는 `console.timeStamp` 등이 그대로 CDP로 나가서 타임라인 로그처럼 보일 수 있습니다.
- **조건**: `NativeModules.SourceCode`의 `scriptURL`이 **문자열이고 `'http'`로 시작**할 때만 Metro로 간주합니다.
  - 예: `http://localhost:8081/...` → Metro로 인식 → 훅 비활성화
  - 예: `file://...` 또는 `scriptURL` 없음/예외 → Metro 아님 → 훅 활성화
- **점검**:
  - 실제로 디버그에서 번들을 `http(s)://`로 받고 있는지 확인
  - `SourceCode.getConstants()`가 없거나, 다른 이름/경로로 주입되는 RN 버전이면 예외로 `false`가 나올 수 있음

### 3. `connect()` called without Provider

- **Provider를 쓰지 않고 `connect()`만 호출**  
  `enableHooks`를 넘기지 않으면 기본값 `true`라서 훅이 켜집니다.  
  Metro여도 그 경로로 연결하면 훅이 활성화된 상태로 동작합니다.
- **점검**: 앱에서 `connect()`를 직접 호출하는 곳이 있는지 확인하고, Metro일 때는 `enableHooks: false`를 넘기거나, Provider를 통해 연결하도록 통일하세요.

### 4. Log source is not our hook

- **React / React Native 쪽에서 찍는 로그**  
  "Waiting for Paint", "Blocking Scheduler", "⚛" 같은 내용은 React Scheduler·성능 관련 코드에서 나올 수 있습니다.  
  이 경우 **Metro 터미널**이나 **RN 원본 콘솔**에만 보일 수 있고, 우리 훅 on/off와 무관합니다.
- **표시 위치**  
  로그가 **브라우저 DevTools 콘솔**에만 보이는지, **Metro 터미널**에도 보이는지 구분하면, 우리 훅을 타서 CDP로 간 것인지 판단하는 데 도움이 됩니다.

## Quick checks

1. Metro 캐시 리셋 후 앱 재연결: `npx react-native start --reset-cache` (또는 사용 중인 start 스크립트에 `--reset-cache` 추가)
2. `connect()` 호출 경로: 모두 Provider 경로인지, 직접 호출 시 `enableHooks` 전달 여부
3. 로그가 나오는 곳: DevTools 콘솔만인지, Metro 터미널/기기 로그에도 나오는지
