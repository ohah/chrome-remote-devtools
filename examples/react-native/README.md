# Chrome Remote DevTools React Native Example

This is a React Native example app for Chrome Remote DevTools that demonstrates session recording functionality.

## Prerequisites

Before you begin, ensure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) guide.

### Required Tools

- Node.js >= 20 (managed by mise)
- Bun (managed by mise)
- Ruby 3.3 (managed by mise, for iOS CocoaPods)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Setup with mise

This project uses [mise](https://mise.jdx.dev/) for tool version management. The required tools are automatically installed when you run `mise install`:

```sh
# From project root
mise install

# Or from examples/react-native
cd examples/react-native
mise install
```

## Getting Started

### Step 1: Install Dependencies

From the project root, install workspace dependencies:

```sh
# Using bun (recommended)
bun install

# OR using npm
npm install
```

Then, navigate to the React Native example directory:

```sh
cd examples/react-native
```

Install React Native dependencies:

```sh
# Using bun
bun install

# OR using npm
npm install
```

### Step 2: Copy Native Files from hwpjs Example

Copy necessary native files (gradlew, Xcode projects, etc.) from the hwpjs example:

```sh
cd examples/react-native
./scripts/copy-native-files.sh
```

This script will copy:

- Android `gradlew` and `gradlew.bat` files (already created, but script will ensure they're up to date)
- Android `gradle-wrapper.jar` (binary file, must be copied manually)
- iOS Xcode project files (`.xcodeproj` and `.xcworkspace`) - **Required for pod install**
- iOS `LaunchScreen.storyboard` (already created)
- iOS `Images.xcassets` (already created)
- iOS `PrivacyInfo.xcprivacy` (already created)

**Important**: If the script fails or Xcode project files are missing, copy them manually:

```sh
cd examples/react-native

# Copy Xcode project
cp -r ../../hwpjs/examples/react-native/ios/ReactNativeExample.xcodeproj ios/ChromeRemoteDevTools.xcodeproj

# Copy Xcode workspace
cp -r ../../hwpjs/examples/react-native/ios/ReactNativeExample.xcworkspace ios/ChromeRemoteDevTools.xcworkspace

# Rename references in project files
find ios/ChromeRemoteDevTools.xcodeproj -type f -name "*.pbxproj" -exec sed -i '' 's/ReactNativeExample/ChromeRemoteDevTools/g' {} \;
find ios/ChromeRemoteDevTools.xcworkspace -type f -exec sed -i '' 's/ReactNativeExample/ChromeRemoteDevTools/g' {} \;

# Copy gradle-wrapper.jar
cp ../../hwpjs/examples/react-native/android/gradle/wrapper/gradle-wrapper.jar android/gradle/wrapper/
```

**Note**: The script will automatically rename references from `ReactNativeExample` to `ChromeRemoteDevTools`.

### Step 3: Install iOS Dependencies (iOS only)

**Important**: Before installing CocoaPods, ensure Xcode Command Line Tools are installed:

```sh
xcode-select --install
```

For iOS, you need to install CocoaPods dependencies. First, install the Ruby bundler (first time only):

```sh
cd ios
mise exec -- bundle install
```

If `mise exec` fails with native extension build errors, try using system Ruby:

```sh
/usr/bin/ruby -S bundle install
```

Then install CocoaPods dependencies:

```sh
bundle exec pod install
cd ..
```

**Note**: If you encounter native extension build errors, see the "iOS CocoaPods Installation Issues" section in Troubleshooting.

### Step 4: Start Chrome Remote DevTools Server

In a separate terminal, start the Chrome Remote DevTools server from the project root:

```sh
# From project root
bun run dev:server
```

The server will start on `ws://localhost:8080` by default.

### Step 5: Start Metro Bundler

Start the Metro bundler from the React Native example directory:

```sh
# From examples/react-native
bun run start

# OR
npm start
```

### Step 6: Run the App

With Metro running, open a new terminal and run the app:

#### Android

```sh
bun run android

# OR
npm run android
```

#### iOS

```sh
bun run ios

# OR
npm run ios
```

## Usage

1. **Connect to Server**:
   - On Android emulator/USB device, run once: `adb reverse tcp:8080 tcp:8080`. Then use default `ws://localhost:8080`.
   - Enter the server WebSocket URL (default: `ws://localhost:8080`) and click "Connect" to establish connection

2. **Start Recording**:
   - Once connected, click "Start Recording" to begin session recording
   - The app will record user interactions and view changes

3. **View Recorded Session**:
   - Open Chrome Remote DevTools Inspector in your browser
   - Navigate to the Session Replay panel
   - View the recorded session replay

## Configuration

### Server URL

The example uses `localhost:8080` for both iOS and Android. On **Android emulator or USB device**, run once so that `localhost` reaches the host PC:

```bash
adb reverse tcp:8080 tcp:8080
```

Then reload the app. You can change the server in the app's UI or in `src/App.tsx` (`ChromeRemoteDevToolsInspectorProvider serverHost/serverPort`).

### Rrweb Configuration

Session recording is configured in `src/App.tsx`. You can modify the rrweb settings:

```typescript
await init({
  serverUrl,
  rrweb: {
    enable: true,
    flushIntervalMs: 1000,  // Flush interval in milliseconds
    maxBatchSize: 50,       // Maximum batch size for events
  },
});
```

## Project Structure

```
examples/react-native/
├── android/          # Android native project
├── ios/              # iOS native project
├── src/
│   ├── App.tsx      # Main app component
│   └── utils/       # Utility functions
├── app.json          # App metadata
├── babel.config.js   # Babel configuration
├── index.js          # Entry point
├── metro.config.js   # Metro bundler configuration
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript configuration
```

## Native build (inspector JS-only) / 네이티브 빌드 (인스펙터 JS 전용)

This example app excludes `@ohah/chrome-remote-devtools-inspector-react-native` from the native build via `react-native.config.js` (`platforms: { android: null, ios: null }`). Only the inspector's JavaScript code (WebSocket, console/network hooks) runs; no Kotlin or Swift from that package is built. If you remove that config, the app will link and build the package's `android/` and `ios/` again.

이 예제 앱은 `react-native.config.js`에서 `@ohah/chrome-remote-devtools-inspector-react-native`를 네이티브 빌드에서 제외합니다(`platforms: { android: null, ios: null }`). 인스펙터의 JavaScript(WebSocket, 콘솔/네트워크 훅)만 실행되며, 해당 패키지의 Kotlin/Swift는 빌드되지 않습니다. 해당 설정을 제거하면 앱이 패키지의 `android/`, `ios/`를 다시 링크·빌드합니다.

## Troubleshooting

### Connection Issues

- **Cannot connect to server**: Ensure the Chrome Remote DevTools server is running (`bun run dev:server`)
- **WebSocket connection failed**: Check that the server URL is correct and the server is accessible
- **Android emulator / USB device**: Run `adb reverse tcp:8080 tcp:8080` once so that `localhost:8080` in the app reaches the host PC (Android 5.x+)

### Metro bundler: "No host header" or ENOENT watch on `target/`

When running Metro in the monorepo you may see:

- **Error: No host header was found** — Metro 0.83+ requires a `Host` header on requests. Some clients or tools may omit it.
- **ENOENT: no such file or directory, watch '.../target/debug/deps/.tmp...'** — Metro is watching the Rust `target/` directory; temporary cargo files cause watch errors.

**Fixes:**

1. **Exclude `target/` from Metro** — The `@ohah/chrome-remote-devtools-inspector-react-native` Metro config already adds a `blockList` for `target/`. If you still see ENOENT, ensure you are using the latest package and that Metro is loading this config.

2. **Use the custom server when "No host header" appears** — Start Metro with the wrapper that injects a `Host` header:
   ```sh
   cd examples/react-native
   bun run start:with-host
   # or: node scripts/start-with-host.js
   ```
   Then run the app as usual (`bun run android` / `bun run ios`).

### iOS CocoaPods Installation Issues

If you encounter "You have to install development tools first" or native extension build errors:

1. **Install Xcode Command Line Tools:**

   ```sh
   xcode-select --install
   ```

   Follow the installation prompts and wait for completion.

2. **Verify installation:**

   ```sh
   xcode-select -p
   # Should output: /Library/Developer/CommandLineTools
   ```

3. **Verify compiler is available:**

   ```sh
   which gcc
   which clang
   ```

4. **Try bundle install again with mise:**

   ```sh
   cd ios
   mise exec -- bundle install
   ```

5. **Alternative: Use system Ruby (if mise Ruby fails):**

   ```sh
   cd ios
   /usr/bin/ruby -S bundle install
   ```

6. **Or install CocoaPods directly without bundler:**
   ```sh
   gem install cocoapods
   cd ios
   pod install
   ```

**Note**: The Gemfile has been configured to exclude problematic gem versions that cause build failures. If you still encounter issues, ensure Xcode Command Line Tools are properly installed.

### Build Issues

- **Android build fails**: Ensure Android SDK is properly installed and `ANDROID_HOME` is set
- **iOS build fails**:
  - Ensure CocoaPods dependencies are installed: `cd ios && bundle exec pod install`
  - If pod install fails, see "iOS CocoaPods Installation Issues" above
- **Metro bundler issues**: Clear Metro cache with `bun run start --reset-cache`

### React Native Setup Issues

If you encounter issues with React Native setup, refer to the [React Native Troubleshooting Guide](https://reactnative.dev/docs/troubleshooting).

## Development

### Hot Reload

The app supports Fast Refresh. Changes to `src/App.tsx` will automatically reload in the app.

### Debugging

- **Android**: Use Chrome DevTools or React Native Debugger
- **iOS**: Use Safari Web Inspector or React Native Debugger

### Testing

Run tests with:

```sh
bun test

# OR
npm test
```

## Learn More

- [Chrome Remote DevTools Documentation](../../README.md)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Rrweb Documentation](https://github.com/rrweb-io/rrweb)
