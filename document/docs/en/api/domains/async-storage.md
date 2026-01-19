# AsyncStorageStorage Domain

The AsyncStorageStorage domain is a custom CDP domain for inspecting and modifying AsyncStorage in React Native apps.

## Overview

The AsyncStorageStorage domain allows you to inspect and modify AsyncStorage instances used in React Native from Chrome DevTools.

## Methods

### AsyncStorageStorage.enable

Enables the AsyncStorageStorage domain. When enabled, snapshots of all registered AsyncStorage instances are automatically sent.

### AsyncStorageStorage.getAsyncStorageItems

Gets all items from an AsyncStorage instance.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID

**Returns:**

- `entries`: Array of items (each item is a string array in the format `[key, value]`)

### AsyncStorageStorage.setAsyncStorageItem

Sets an item in an AsyncStorage instance.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID
- `key` (string): Key
- `value` (string): Value (AsyncStorage only stores strings)

### AsyncStorageStorage.removeAsyncStorageItem

Removes an item from an AsyncStorage instance.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID
- `key` (string): Key to remove

### AsyncStorageStorage.clear

Removes all items from an AsyncStorage instance.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID

## Events

### AsyncStorageStorage.asyncStorageInstanceCreated

Emitted when an AsyncStorage instance is created.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID

### AsyncStorageStorage.asyncStorageItemAdded

Emitted when an AsyncStorage item is added.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID
- `key` (string): Key
- `newValue` (string): New value

### AsyncStorageStorage.asyncStorageItemUpdated

Emitted when an AsyncStorage item is updated.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID
- `key` (string): Key
- `oldValue` (string): Old value
- `newValue` (string): New value

### AsyncStorageStorage.asyncStorageItemRemoved

Emitted when an AsyncStorage item is removed.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID
- `key` (string): Removed key

### AsyncStorageStorage.asyncStorageItemsCleared

Emitted when all items in an AsyncStorage instance are cleared.

**Parameters:**

- `instanceId` (string): AsyncStorage instance ID

## Usage

To register AsyncStorage instances in your React Native app:

```typescript
import { registerAsyncStorageDevTools } from '@ohah/chrome-remote-devtools-inspector-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Register default AsyncStorage instance
registerAsyncStorageDevTools(AsyncStorage);

// Register multiple instances (if you have custom AsyncStorage)
registerAsyncStorageDevTools({
  'default': AsyncStorage,
  'custom': customAsyncStorage,
});

// Use blacklist pattern (optional)
registerAsyncStorageDevTools(AsyncStorage, /^_/); // Exclude keys starting with '_'
```

## Notes

- The AsyncStorageStorage domain is a React Native-only custom CDP domain.
- AsyncStorage instances must be registered using `registerAsyncStorageDevTools()` to be inspectable in DevTools.
- AsyncStorage only stores strings, so all values are sent as strings.
- All AsyncStorage methods (setItem, removeItem, clear, multiSet, multiRemove, multiMerge) are automatically hooked to detect changes.
