// Storage domain implementation / Storage 도메인 구현
import BaseDomain from '../base';

export class Storage extends BaseDomain {
  override namespace = 'Storage';

  // Get storage key for current frame / 현재 프레임의 storage key 가져오기
  getStorageKey(_params?: { frameId?: string }): { storageKey: string } {
    const storageKey = location.origin;
    return {
      storageKey,
    };
  }
}
