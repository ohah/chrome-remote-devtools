// Page information utilities / 페이지 정보 유틸리티
import { getAbsolutePath } from '../cdp/common/utils';

/**
 * Get document favicon URL / 문서 파비콘 URL 가져오기
 * @returns Favicon URL / 파비콘 URL
 */
export function getDocumentFavicon(): string {
  const links = document.head.querySelectorAll('link');
  const icon = Array.from(links).find((link) => {
    const rel = link.getAttribute('rel');
    return rel?.includes('icon') || rel?.includes('shortcut');
  });

  let iconUrl = '';
  if (icon) {
    iconUrl = getAbsolutePath(icon.getAttribute('href') || '');
  }

  return iconUrl;
}

/**
 * Get query string with page information / 페이지 정보가 포함된 쿼리 문자열 가져오기
 * @returns Query string / 쿼리 문자열
 */
export function getQuery(): string {
  const search = new URLSearchParams();
  search.append('url', location.href);
  search.append('title', document.title);
  search.append('favicon', getDocumentFavicon());
  search.append('time', Date.now().toString());
  search.append('ua', navigator.userAgent);
  return search.toString();
}
