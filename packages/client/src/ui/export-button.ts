// Export button UI injection / Export 버튼 UI 주입
import type { EventStorage } from '../persistence/event-storage';

/**
 * Inject export button into webpage / 웹페이지에 export 버튼 주입
 */
export function injectExportButton(eventStorage: EventStorage): void {
  // Check if button already exists / 버튼이 이미 존재하는지 확인
  if (document.getElementById('chrome-remote-devtools-export-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'chrome-remote-devtools-export-btn';
  button.title = 'Export CDP events to JSON file';

  // Set initial download icon / 초기 다운로드 아이콘 설정
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13V3M10 13L6 9M10 13L14 9M3 16H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // 스타일링
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
  `;

  button.addEventListener('click', async () => {
    button.disabled = true;
    // Show loading spinner icon / 로딩 스피너 아이콘 표시
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
        <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-opacity="0.3" fill="none"/>
        <path d="M10 2C10 2 13 6 13 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
      </svg>
    `;
    try {
      await eventStorage.exportToFile();
      // Show checkmark icon / 체크마크 아이콘 표시
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.5 5.5L7.5 14.5L3.5 10.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      setTimeout(() => {
        // Restore download icon / 다운로드 아이콘 복원
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 13V3M10 13L6 9M10 13L14 9M3 16H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        button.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to export events / 이벤트 내보내기 실패:', error);
      // Show error icon / 에러 아이콘 표시
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M10 6V10M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      setTimeout(() => {
        // Restore download icon / 다운로드 아이콘 복원
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 13V3M10 13L6 9M10 13L14 9M3 16H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        button.disabled = false;
      }, 2000);
    }
  });

  document.body.appendChild(button);
}
