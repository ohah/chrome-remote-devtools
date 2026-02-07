// Metro WebSocket proxy handler module / Metro WebSocket 프록시 핸들러 모듈
// Split into submodules for URL rewriting and WebSocket handling
// URL 재작성과 WebSocket 처리를 하위 모듈로 분리

mod handler;
mod url_rewriting;

pub use handler::handle_metro_proxy_websocket;

/// Check if a CDP method belongs to a custom domain that should be routed to the RN app
/// 커스텀 도메인(RN 앱으로 라우팅해야 하는) CDP 메서드인지 확인
pub(crate) fn is_custom_cdp_domain(method: &str) -> bool {
    method.starts_with("MMKVStorage.")
        || method.starts_with("AsyncStorageStorage.")
        || method.starts_with("Redux.")
        || method.starts_with("Storage.")
        || method.starts_with("SessionReplay.")
}
