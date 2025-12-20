// Console domain implementation / Console 도메인 구현
import BaseDomain from './base';
import { Event } from './protocol';

export default class Console extends BaseDomain {
  override namespace = 'Console';

  private isEnable = false;

  // Enable Console domain / Console 도메인 활성화
  override enable(): void {
    this.isEnable = true;
  }

  // Clear messages / 메시지 지우기
  clearMessages(): void {
    // Console messages are handled by Runtime domain
    // This is a placeholder for Console domain
  }
}
