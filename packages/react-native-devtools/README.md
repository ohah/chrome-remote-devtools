# React + Tailwind + Vite Electrobun Template

A fast Electrobun desktop app template with React, Tailwind CSS, and Vite for hot module replacement (HMR).

## Getting Started

```bash
# Install dependencies
bun install

# Development without HMR (uses bundled assets)
bun run dev

# Development with HMR (recommended)
bun run dev:hmr

# Build for production
bun run build

# Build for production release
bun run build:prod
```

## How HMR Works

When you run `bun run dev:hmr`:

1. **Vite dev server** starts on `http://localhost:2420` with HMR enabled
2. **Electrobun** starts and detects the running Vite server
3. The app loads from the Vite dev server instead of bundled assets
4. Changes to React components update instantly without full page reload

When you run `bun run dev` (without HMR):

1. Electrobun starts and loads from `views://mainview/index.html`
2. You need to rebuild (`bun run build`) to see changes

## Project Structure

```
├── src/
│   ├── bun/
│   │   └── index.ts        # Main process (Electrobun/Bun)
│   └── mainview/
│       ├── App.tsx         # React app component
│       ├── main.tsx        # React entry point
│       ├── index.html      # HTML template
│       └── index.css       # Tailwind CSS
├── electrobun.config.ts    # Electrobun configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json
```

## Distribution build (macOS code signing)

To build a signed .app for distribution:

- **다른 사람 Mac에서 경고 없이 실행**하려면 **노타라이즈(notarize)**까지 해야 합니다. 코드 서명만 있으면 받는 쪽에서 "식별되지 않은 개발자" 경고가 뜹니다.
- **본인 기기·테스트만** 쓰면 코드 서명만으로 충분합니다.

1. In `electrobun.config.ts`, under `build.mac`, set `codesign: true`. For distribution to other users, also set `notarize: true`.
2. Environment variables:
   - **Codesign**: `ELECTROBUN_DEVELOPER_ID` (e.g. `"Developer ID Application: Your Name (TEAM_ID)"`).
   - **Notarize** (필요 시): `ELECTROBUN_APPLEID`, `ELECTROBUN_APPLEIDPASS` (앱 전용 암호), `ELECTROBUN_TEAMID`.

Example (codesign only, 본인 기기/테스트용):

```bash
export ELECTROBUN_DEVELOPER_ID="Developer ID Application: Your Name (XXXXXXXX)"
bun run build
```

Example (codesign + notarize, 다른 기기에서 실행할 때 권장):

```bash
export ELECTROBUN_DEVELOPER_ID="Developer ID Application: Your Name (XXXXXXXX)"
export ELECTROBUN_APPLEID="your@apple.id"
export ELECTROBUN_APPLEIDPASS="app-specific-password"
export ELECTROBUN_TEAMID="XXXXXXXX"
bun run build
```

The built .app will be in the Electrobun output directory (e.g. `dist/` or as per electrobun CLI).

## Customizing

- **React components**: Edit files in `src/mainview/`
- **Tailwind theme**: Edit `tailwind.config.js`
- **Vite settings**: Edit `vite.config.ts`
- **Window settings**: Edit `src/bun/index.ts`
- **App metadata**: Edit `electrobun.config.ts`
