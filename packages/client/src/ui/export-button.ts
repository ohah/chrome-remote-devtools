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
  button.textContent = 'Export Events';
  button.title = 'Export CDP events to JSON file';

  // 스타일링
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 10px 20px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Exporting...';
    try {
      await eventStorage.exportToFile();
      button.textContent = 'Exported!';
      setTimeout(() => {
        button.textContent = 'Export Events';
        button.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to export events / 이벤트 내보내기 실패:', error);
      button.textContent = 'Export Failed';
      setTimeout(() => {
        button.textContent = 'Export Events';
        button.disabled = false;
      }, 2000);
    }
  });

  document.body.appendChild(button);
}
