// Page domain implementation / Page 도메인 구현
import BaseDomain from './base';
import { Event } from './protocol';

export default class Page extends BaseDomain {
  override namespace = 'Page';

  private frame = new Map<string, string>();
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  // Enable Page domain / Page 도메인 활성화
  override enable(): void {
    const xhr = new XMLHttpRequest();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (xhr as any).$$requestType = 'Document';
    xhr.onload = () => {
      this.frame.set(location.href, xhr.responseText);
    };
    xhr.onerror = () => {
      this.frame.set(location.href, 'Cannot get script source code');
    };

    xhr.open('GET', location.href);
    xhr.send();
  }

  // Get resource tree / 리소스 트리 가져오기
  getResourceTree(): {
    frameTree: {
      frame: {
        id: string;
        mimeType: string;
        securityOrigin: string;
        url: string;
      };
      resources: unknown[];
    };
  } {
    // Frame ID should be a string according to CDP spec / CDP 스펙에 따르면 Frame ID는 문자열이어야 함
    return {
      frameTree: {
        frame: {
          id: '1',
          mimeType: 'text/html',
          securityOrigin: location.origin,
          url: location.href,
        },
        resources: [],
      },
    };
  }

  // Get resource content / 리소스 내용 가져오기
  getResourceContent({ url }: { url: string }): { content: string | undefined } {
    return {
      content: this.frame.get(url),
    };
  }

  // Start screencast / 스크린캐스트 시작
  startScreencast(): void {
    const captureScreen = () => {
      if (document.hidden) return;

      // Simple screenshot using html2canvas or canvas
      // For now, send a placeholder
      try {
        // Try to capture using canvas if possible
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          this.send({
            method: Event.screencastFrame,
            params: {
              data: base64.replace(/^data:image\/jpeg;base64,/, ''),
              sessionId: 1,
              metadata: {
                deviceHeight: window.innerHeight,
                deviceWidth: window.innerWidth,
                pageScaleFactor: 1,
                offsetTop: 0,
                scrollOffsetX: window.scrollX,
                scrollOffsetY: window.scrollY,
                timestamp: Date.now(),
              },
            },
          });
        }
      } catch (error) {
        // Ignore errors
      }
    };

    captureScreen();
    this.intervalTimer = setInterval(captureScreen, 1000);
  }

  // Stop screencast / 스크린캐스트 중지
  stopScreencast(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}
