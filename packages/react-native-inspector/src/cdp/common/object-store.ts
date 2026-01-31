// Object store for CDP objectId (same as web client: same object = same id, getProperties/releaseObject) / CDP objectId용 객체 저장소 (웹과 동일: 동일 객체 = 동일 id, getProperties/releaseObject)

const objectIds = new Map<unknown, string>();
const objects = new Map<string, unknown>();
let nextId = 1;

/**
 * Get or create objectId for a value; same object reference = same id / 값에 대한 objectId 조회 또는 생성, 동일 참조 = 동일 id
 */
export function getOrCreateObjectId(obj: unknown): string {
  const existing = objectIds.get(obj);
  if (existing) return existing;
  const id = String(nextId++);
  objects.set(id, obj);
  objectIds.set(obj, id);
  return id;
}

/**
 * Release object by objectId (DevTools calls Runtime.releaseObject) / objectId로 객체 해제
 */
export function releaseObject(objectId: string): void {
  const obj = objects.get(objectId);
  if (obj !== undefined) {
    objects.delete(objectId);
    objectIds.delete(obj);
  }
}

/**
 * Get stored object by objectId / objectId로 저장된 객체 조회
 */
export function getObject(objectId: string): unknown {
  return objects.get(objectId);
}
