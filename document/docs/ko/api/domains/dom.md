# DOM Domain

DOM 도메인은 DOM 검사 및 페이지 구조 보기를 처리합니다.

## Methods

### DOM.getDocument

문서의 루트 노드를 가져옵니다.

**Returns:**
- `root`: 루트 노드

### DOM.querySelector

CSS 선택자로 요소를 찾습니다.

**Parameters:**
- `nodeId` (number): 검색을 시작할 노드 ID
- `selector` (string): CSS 선택자

**Returns:**
- `nodeId`: 찾은 노드 ID

### DOM.getAttributes

노드의 속성을 가져옵니다.

**Parameters:**
- `nodeId` (number): 노드 ID

**Returns:**
- `attributes`: 속성 배열

## Events

### DOM.documentUpdated

문서가 업데이트되었을 때 발생합니다.

### DOM.setChildNodes

자식 노드가 설정되었을 때 발생합니다.

**Parameters:**
- `parentId` (number): 부모 노드 ID
- `nodes`: 자식 노드 배열
