# Bringing React DevTools Components & Profiler

This guide describes how to add the **React DevTools Components** and **Profiler** panels to this project so they work with React Native clients, matching the reference `reference/react-native-devtools-frontend`.

## Overview

The reference uses:

1. **Frontend (DevTools UI)**
   - `panels/react_devtools/` — Components and Profiler views.
   - `models/react_native/ReactDevToolsBindingsModel.ts` — Sends/receives messages via CDP Runtime (addBinding + evaluate).
   - `third_party/react-devtools/` — React DevTools UI (bridge, store, `initializeComponents`, `initializeProfiler`) from [facebook/react react-devtools-fusebox](https://github.com/facebook/react/tree/main/packages/react-devtools-fusebox).

2. **Backend (RN app)**
   - A global dispatcher (e.g. `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__`) that:
     - Exposes `BINDING_NAME` for CDP `Runtime.addBinding`.
     - Implements `sendMessage(domain, payload)` (called from frontend via `Runtime.evaluate`).
     - Implements `initializeDomain(domain)` (called from frontend).
     - Sends messages to the frontend by invoking the CDP binding (so the frontend receives `Runtime.bindingCalled`).
   - The **React DevTools backend** runs in the RN JS context and talks to this dispatcher.

Our stack already has **CDP over WebSocket** and **Runtime** (evaluate, addBinding, BindingCalled). What we lack is:

- The frontend panels + model + third_party bundle.
- The RN-side dispatcher + React DevTools backend.

---

## Step 1: Frontend — Copy panels, model, and third_party

Copy these from `reference/react-native-devtools-frontend/front_end/` into our `devtools/devtools-frontend/front_end/`:

| From (reference)              | To (our devtools-frontend)    |
| ----------------------------- | ----------------------------- |
| `panels/react_devtools/`      | `panels/react_devtools/`      |
| `models/react_native/`        | `models/react_native/`        |
| `third_party/react-devtools/` | `third_party/react-devtools/` |

- Keep license headers (Chromium + Meta where applicable).
- Our project may use a different build (e.g. Nice-PLQ, no BUILD.gn). If you use BUILD.gn, add the new modules there; otherwise ensure entrypoints and meta files are loaded.

---

## Step 2: Frontend — Register panels and add clientType condition

1. **Register the panels in the app entrypoint**  
   In `devtools/devtools-frontend/front_end/entrypoints/devtools_app/devtools_app.ts`, add:

   ```ts
   import '../../panels/react_devtools/react_devtools_components-meta.js';
   import '../../panels/react_devtools/react_devtools_profiler-meta.js';
   ```

2. **Show panels only for React Native**  
   In `react_devtools_components-meta.ts` and `react_devtools_profiler-meta.ts`, register the view with a condition (same pattern as `storage-meta.ts` / `redux-meta.ts`):

   ```ts
   UI.ViewManager.registerViewExtension({
     // ... id, title, etc.
     condition: () => Root.Runtime.Runtime.queryParam('clientType') === 'react-native',
     async loadView() { ... },
   });
   ```

3. **Register ReactDevToolsBindingsModel**  
   The model is already registered in `ReactDevToolsModel.ts` and `ReactDevToolsBindingsModel.ts` with `SDK.SDKModel.SDKModel.register(..., { autostart: false })`. It will be created when a panel is opened and the target has the bindings model. Ensure `ReactDevToolsBindingsModel` is registered and that the target has `RuntimeModel` (we already use CDP Runtime).

---

## Step 3: Backend (RN app) — Dispatcher + React DevTools backend

The frontend expects the RN app to expose a **dispatcher** that uses CDP Runtime:

- Frontend calls `Runtime.addBinding(bindingName)` and `Runtime.evaluate(__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__.sendMessage('react-devtools', json))` to send messages.
- RN app sends messages back by invoking the binding (so the frontend gets `Runtime.bindingCalled`).

So on the RN side you need:

1. **React DevTools backend** running in the JS context (e.g. from `react-devtools-inline`, `react-devtools-core`, or the same backend Fusebox uses).
2. **Dispatcher global** (e.g. `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__` or a name you use consistently):
   - `BINDING_NAME` — string used for `addBinding`.
   - `initializeDomain(domain)` — called by frontend; wire to your backend.
   - `sendMessage(domain, serializedMessage)` — called by frontend via evaluate; parse JSON and forward to backend.
   - When the backend has a message for the frontend, call the CDP binding (same name as `BINDING_NAME`) with a payload like `{ domain: 'react-devtools', message: ... }`.
3. **CDP Runtime integration**  
   Our `react-native-inspector` (or the layer that handles CDP) must:
   - Handle `Runtime.addBinding` and store the binding name.
   - When the app calls that binding (e.g. via a global function you expose), send a CDP `Runtime.bindingCalled` event to the frontend.
   - Handle `Runtime.evaluate` and run `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__.sendMessage(...)` / `initializeDomain(...)` in the JS context.

Currently **`packages/react-native-inspector` does not implement this**. You can:

- Add a new CDP domain or Runtime hook in react-native-inspector that:
  - Injects the dispatcher object and the React DevTools backend into the app bundle (or loads them when the inspector connects).
  - Implements addBinding + bindingCalled and evaluate so the frontend’s `ReactDevToolsBindingsModel` works unchanged.
- Or reuse the same approach as the reference RN/Fusebox app: ensure the app (or a separate integration package) injects the dispatcher and backend and that your CDP relay supports Runtime.addBinding and BindingCalled.

---

## Step 4: third_party/react-devtools source

The reference’s `third_party/react-devtools/` comes from [facebook/react packages/react-devtools-fusebox](https://github.com/facebook/react/tree/main/packages/react-devtools-fusebox). From the reference README:

1. Clone [react](https://github.com/facebook/react), run `yarn build` in `packages/react-devtools-fusebox`.
2. Copy the build output into `front_end/third_party/react-devtools/package/`.

Alternatively, copy the existing `package/` (and `react-devtools.ts`, `README.md`) from `reference/react-native-devtools-frontend/front_end/third_party/react-devtools/` so the frontend has `createBridge`, `createStore`, `initializeComponents`, `initializeProfiler`, and the CSS.

---

## Summary checklist

| Layer                               | Task                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **devtools-frontend**               | Copy `panels/react_devtools/`, `models/react_native/`, `third_party/react-devtools/` from reference.                                                  |
| **devtools_app**                    | Import `react_devtools_components-meta.js` and `react_devtools_profiler-meta.js`.                                                                     |
| **react_devtools \*-meta.ts**       | Add `condition: () => queryParam('clientType') === 'react-native'`.                                                                                   |
| **Build/config**                    | Add new modules to your build (e.g. BUILD.gn or bundler entrypoints).                                                                                 |
| **RN app / react-native-inspector** | Implement dispatcher global + React DevTools backend; handle Runtime.addBinding and bindingCalled; support evaluate for sendMessage/initializeDomain. |
| **third_party/react-devtools**      | Obtain from reference copy or build from react repo react-devtools-fusebox.                                                                           |

Once the RN side exposes the same dispatcher + binding contract as the reference, the existing `ReactDevToolsBindingsModel` and panels should work with minimal changes.

---

## Implementation status and fixes

Rendering and functionality work with the following in place:

1. **react-native-inspector**
   - **Runtime.evaluate** must return the **expression value** (e.g. `globalThis.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ != undefined` → `true`/`false`). The frontend polls this; returning `undefined` causes timeout and an empty panel. Use `(0, eval)(expr)` or equivalent so the expression result is returned.
   - **Runtime.addBinding** and **Runtime.bindingCalled**: handle and register the binding name; when the app invokes the binding, send a CDP `Runtime.bindingCalled` event.

2. **Inspector**
   - Pass **clientId** (and **clientType**) in the DevTools iframe URL so the panel condition (`clientType === 'react-native'` or `clientId.startsWith('rn-inspector-')`) shows the Components/Profiler tabs for RN clients.

3. **DevTools iframe (CSP)**
   - The third_party React DevTools bundle uses `new Function()` and `new Worker(URL.createObjectURL(new Blob([...])))`. Add to the entrypoint HTML CSP:
     - **script-src**: `'unsafe-eval'`, `blob:`
     - **worker-src**: `'self'`, `blob:`
   - Otherwise you get `EvalError: Refused to evaluate...` or `SecurityError: The operation is insecure`.

4. **React DevTools panel CSS**
   - `#clearView()` must not remove the `<style>` injected by `registerRequiredCSS(ReactDevTools.CSS)`. Use a **content wrapper** div: append only the wrapper to `contentElement`, clear only the wrapper in `#clearView()`, and pass the wrapper to `initializeComponents` / `initializeProfiler`. Keep the `<style>` as a sibling of the wrapper so it is never removed.
