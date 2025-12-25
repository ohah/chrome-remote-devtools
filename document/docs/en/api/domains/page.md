# Page Domain

The Page domain handles page navigation and lifecycle.

## Methods

### Page.enable

Enables the Page domain.

### Page.disable

Disables the Page domain.

### Page.getResourceTree

Gets the page resource tree.

**Returns:**

- `frameTree`: Frame tree structure

## Events

### Page.loadEventFired

Emitted when the page load event fires.

**Parameters:**

- `timestamp`: Timestamp

### Page.domContentEventFired

Emitted when the DOM content event fires.

**Parameters:**

- `timestamp`: Timestamp

### Page.frameNavigated

Emitted when a frame is navigated.

**Parameters:**

- `frame`: Frame information
