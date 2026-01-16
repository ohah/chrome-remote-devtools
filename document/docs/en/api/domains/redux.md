# Redux Domain

The Redux domain is a custom CDP domain for tracking Redux state changes and actions in React Native apps.

## Overview

The Redux domain provides integration with Redux DevTools Extension for debugging Redux applications. Redux actions and state changes are sent as CDP messages and can be viewed in the Redux panel in DevTools.

## Methods

### Redux.message

Sends a Redux message from the application to DevTools or vice versa. This is the unified method that handles all Redux message types. Matches Redux DevTools Extension message format exactly.

**Parameters:**

- `type` (MessageType): Message type
  - `INIT_INSTANCE`: Redux instance initialization
  - `INIT`: Store initialization
  - `ACTION`: Action dispatch
  - `STATE`: State update
  - `ERROR`: Error occurred
- `action` (string, optional): Action payload (JSON string, for ACTION type)
- `payload` (string, optional): State payload (JSON string, for INIT and ACTION types)
- `source` (string): Source of the message (e.g., "@devtools-page", "@devtools-extension")
- `instanceId` (string): Instance ID of the Redux store
- `name` (string, optional): Store name (for INIT type)
- `maxAge` (integer, optional): Maximum age of actions to keep (for ACTION type)
- `nextActionId` (integer, optional): Next action ID (for ACTION type)
- `error` (string, optional): Error message (for ERROR type)
- `timestamp` (Runtime.Timestamp, optional): Timestamp when the message was created

## Events

### Redux.message

Emitted when a Redux message is received from the application. Matches Redux DevTools Extension message format exactly.

**Parameters:**

- `type` (MessageType): Message type
- `action` (string, optional): Action payload (JSON string, for ACTION type)
- `payload` (string, optional): State payload (JSON string, for INIT and ACTION types)
- `source` (string): Source of the message
- `instanceId` (string): Instance ID of the Redux store
- `name` (string, optional): Store name (for INIT type)
- `maxAge` (integer, optional): Maximum age of actions to keep (for ACTION type)
- `nextActionId` (integer, optional): Next action ID (for ACTION type)
- `error` (string, optional): Error message (for ERROR type)
- `timestamp` (Runtime.Timestamp, optional): Timestamp when the message was created

## Usage

### React Native

To use Redux DevTools in a React Native app:

```typescript
import { createReduxDevToolsMiddleware } from '@ohah/chrome-remote-devtools-react-native/redux';
import { createStore, applyMiddleware } from 'redux';
import rootReducer from './reducers';

const store = createStore(
  rootReducer,
  applyMiddleware(
    createReduxDevToolsMiddleware({
      name: 'MyApp',
      instanceId: 'main-store'
    })
  )
);
```

### Zustand

To use with Zustand:

```typescript
import { chromeDevtools } from '@ohah/chrome-remote-devtools-react-native/zustand';
import { create } from 'zustand';

const useStore = create(
  chromeDevtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    { name: 'MyStore', instanceId: 'main-store' }
  )
);
```

### Metro Configuration

You need to add Redux DevTools Extension polyfill to your Metro configuration:

```javascript
// metro.config.js
const { withChromeRemoteDevToolsRedux } = require('@ohah/chrome-remote-devtools-react-native/metro');

module.exports = withChromeRemoteDevToolsRedux(metroConfig);
```

## Message Types

### INIT_INSTANCE

Sent when a new Redux instance is initialized. Notifies DevTools of a new store instance.

### INIT

Sent when a store is initialized. Includes initial state and store metadata.

### ACTION

Sent when an action is dispatched. Includes action type and payload.

### STATE

Sent when state changes. Includes the new state.

### ERROR

Sent when an error occurs. Includes error message.

## Notes

- The Redux domain is a React Native-only custom CDP domain.
- Fully compatible with Redux DevTools Extension format.
- Can track multiple Redux store instances simultaneously.
- `__REDUX_DEVTOOLS_EXTENSION__` is automatically injected for compatibility with Redux DevTools Extension API.
