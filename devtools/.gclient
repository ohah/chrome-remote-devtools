# .gclient configuration for standalone devtools-frontend / standalone devtools-frontend를 위한 .gclient 설정
# This file is used by gclient to manage dependencies / 이 파일은 gclient이 의존성을 관리하는 데 사용됩니다

solutions = [
  {
    "name": "devtools-frontend",
    # Use devtools-frontend fork URL / devtools-frontend 포크 URL 사용
    "url": "https://github.com/ohah/devtools-frontend.git",
    # managed: False allows using local fork / managed: False는 로컬 포크 사용 허용
    "deps_file": "DEPS",
    "managed": False,
    "custom_deps": {},
  }
]