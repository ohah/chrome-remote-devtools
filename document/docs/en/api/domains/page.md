# Page Domain

The Page domain provides page navigation and information capabilities.

## Methods

### `Page.enable()`

Enable the Page domain.

### `Page.startScreencast()`

Start capturing screenshots of the page.

### `Page.stopScreencast()`

Stop capturing screenshots.

### `Page.getResourceTree()`

Get the resource tree of the page.

**Returns:** Resource tree structure

### `Page.getResourceContent(frameId: string, url: string)`

Get the content of a resource.

**Parameters:**
- `frameId`: Frame ID
- `url`: Resource URL

**Returns:** Resource content

## Events

### `Page.screencastFrame`

Emitted when a screenshot frame is captured.

### `Page.loadEventFired`

Emitted when the page load event fires.

### `Page.domContentEventFired`

Emitted when the DOM content loaded event fires.

