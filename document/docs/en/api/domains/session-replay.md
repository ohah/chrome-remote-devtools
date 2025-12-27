# SessionReplay Domain

The SessionReplay domain handles recording and replaying user interactions using rrweb.

## Methods

### SessionReplay.enable

Enables the SessionReplay domain and automatically replays stored events.

**Returns:**

- `success`: Whether the operation was successful

### SessionReplay.disable

Disables the SessionReplay domain.

**Returns:**

- `success`: Whether the operation was successful

### SessionReplay.sendEvent

Sends rrweb events as CDP events.

**Parameters:**

- `events` (array, optional): Array of rrweb events to send

**Returns:**

- `success`: Whether the operation was successful

### SessionReplay.replayStoredEvents

Replays stored SessionReplay events from IndexedDB.

**Returns:**

- `success`: Whether the operation was successful
- `count` (number, optional): Number of events replayed

## Events

### SessionReplay.eventRecorded

Emitted when rrweb events are recorded.

**Parameters:**

- `events`: Array of rrweb events
