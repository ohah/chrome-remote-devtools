# DOM Domain

The DOM domain provides DOM inspection and page structure viewing capabilities.

## Methods

### `DOM.enable()`

Enable the DOM domain.

### `DOM.getDocument()`

Get the document node.

**Returns:** Document node structure

### `DOM.removeNode(nodeId: number)`

Remove a node from the DOM.

**Parameters:**

- `nodeId`: Node ID to remove

### `DOM.requestChildNodes(nodeId: number)`

Request child nodes of a node.

**Parameters:**

- `nodeId`: Node ID

### `DOM.getOuterHTML(nodeId: number)`

Get the outer HTML of a node.

**Parameters:**

- `nodeId`: Node ID

**Returns:** Outer HTML string

### `DOM.setOuterHTML(nodeId: number, outerHTML: string)`

Set the outer HTML of a node.

**Parameters:**

- `nodeId`: Node ID
- `outerHTML`: New outer HTML

## Events

### `DOM.setChildNodes`

Emitted when child nodes are set.

### `DOM.childNodeInserted`

Emitted when a child node is inserted.

### `DOM.childNodeRemoved`

Emitted when a child node is removed.

### `DOM.attributeModified`

Emitted when a node attribute is modified.

### `DOM.documentUpdated`

Emitted when the document is updated.
