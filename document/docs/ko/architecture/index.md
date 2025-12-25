# 아키텍처

Chrome Remote DevTools는 웹페이지의 원격 디버깅을 가능하게 하는 3계층 아키텍처를 사용합니다.

## 개요

- [아키텍처 개요](/ko/architecture/overview) - 시스템 아키텍처 및 통신 흐름

## 구성 요소

- [서버](/ko/architecture/server) - WebSocket 릴레이 서버 구현
- [클라이언트](/ko/architecture/client) - CDP 클라이언트 구현
- [Inspector](/ko/architecture/inspector) - Inspector UI 구현
