# DOM Domain

The DOM domain handles DOM inspection and page structure viewing.

## Methods

### DOM.getDocument

Gets the root node of the document.

**Returns:**

- `root`: Root node

### DOM.querySelector

Finds an element using a CSS selector.

**Parameters:**

- `nodeId` (number): Node ID to start the search from
- `selector` (string): CSS selector

**Returns:**

- `nodeId`: Found node ID

### DOM.getAttributes

Gets the attributes of a node.

**Parameters:**

- `nodeId` (number): Node ID

**Returns:**

- `attributes`: Array of attributes

## Events

### DOM.documentUpdated

Emitted when the document is updated.

### DOM.setChildNodes

Emitted when child nodes are set.

**Parameters:**

- `parentId` (number): Parent node ID
- `nodes`: Array of child nodes
