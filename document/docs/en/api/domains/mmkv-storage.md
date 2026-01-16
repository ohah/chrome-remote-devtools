# MMKVStorage Domain

The MMKVStorage domain is a custom CDP domain for inspecting and modifying MMKV storage in React Native apps.

## Overview

The MMKVStorage domain allows you to inspect and modify MMKV (Memory-Mapped Key-Value) storage instances used in React Native from Chrome DevTools.

## Methods

### MMKVStorage.enable

Enables the MMKVStorage domain. When enabled, snapshots of all registered MMKV instances are automatically sent.

### MMKVStorage.getMMKVItems

Gets all items from an MMKV instance.

**Parameters:**

- `instanceId` (string): MMKV instance ID

**Returns:**

- `entries`: Array of items (each item is a string array in the format `[key, value]`)

### MMKVStorage.setMMKVItem

Sets an item in an MMKV instance.

**Parameters:**

- `instanceId` (string): MMKV instance ID
- `key` (string): Key
- `value` (string): Value (passed as string, automatically converted for numbers or booleans)

### MMKVStorage.removeMMKVItem

Removes an item from an MMKV instance.

**Parameters:**

- `instanceId` (string): MMKV instance ID
- `key` (string): Key to remove

### MMKVStorage.clear

Removes all items from an MMKV instance.

**Parameters:**

- `instanceId` (string): MMKV instance ID

## Events

### MMKVStorage.mmkvInstanceCreated

Emitted when an MMKV instance is created.

**Parameters:**

- `instanceId` (string): MMKV instance ID

### MMKVStorage.mmkvItemAdded

Emitted when an MMKV item is added.

**Parameters:**

- `instanceId` (string): MMKV instance ID
- `key` (string): Key
- `newValue` (string): New value

### MMKVStorage.mmkvItemUpdated

Emitted when an MMKV item is updated.

**Parameters:**

- `instanceId` (string): MMKV instance ID
- `key` (string): Key
- `oldValue` (string): Old value
- `newValue` (string): New value

### MMKVStorage.mmkvItemRemoved

Emitted when an MMKV item is removed.

**Parameters:**

- `instanceId` (string): MMKV instance ID
- `key` (string): Removed key

### MMKVStorage.mmkvItemsCleared

Emitted when all items in an MMKV instance are cleared.

**Parameters:**

- `instanceId` (string): MMKV instance ID

## Usage

To register MMKV instances in your React Native app:

```typescript
import { registerMMKVDevTools } from '@ohah/chrome-remote-devtools-react-native';
import { createMMKV } from 'react-native-mmkv';

const userStorage = createMMKV({ id: 'user-storage' });
const cacheStorage = createMMKV({ id: 'cache-storage' });

// Register single instance
registerMMKVDevTools(userStorage);

// Register multiple instances
registerMMKVDevTools({
  'user-storage': userStorage,
  'cache-storage': cacheStorage,
});

// Use blacklist pattern (optional)
registerMMKVDevTools(userStorage, /^_/); // Exclude keys starting with '_'
```

## Notes

- The MMKVStorage domain is a React Native-only custom CDP domain.
- MMKV instances must be registered using `registerMMKVDevTools()` to be inspectable in DevTools.
- Values are sent as strings and automatically converted for numbers or booleans.
