# PR 전 gh 계정 설정 (이 레포 전용)

이 레포(ohah/chrome-remote-devtools)에서는 **ohah** GitHub 계정으로 push·PR을 사용한다.

## 해야 할 것

- **gh만 맞추면 됨**: `gh auth switch` 로 ohah 계정을 쓰면 된다.
- **Git remote는 건드리지 않음**: `git remote set-url` 같은 SSH URL 변경은 하지 않는다. 기존 origin 그대로 둔다.

## 수동으로 할 때

이 레포에서 PR 만들기·푸시 전에:

```bash
gh auth switch --hostname github.com --user ohah
```

작업 끝난 뒤 다른 레포로 갈 때, 원래 쓰던 계정으로 돌리려면:

```bash
gh auth switch --hostname github.com --user <원래_계정명>
```

## /pr 커맨드 동작

`/pr` 실행 시 에이전트가 자동으로:

1. 현재 gh 로그인 계정을 확인하고,
2. ohah가 아니면 **일시적으로 ohah로 전환**한 뒤 push·PR 생성/수정을 하고,
3. **다시 원래 계정으로 전환**한다.

그래서 `/pr` 한 번 실행해도 전역 gh 설정은 원래대로 유지된다.
