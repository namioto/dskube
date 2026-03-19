# dskube

A native Kubernetes GUI for macOS — lightweight, fast, and built on Tauri + Rust.

![Platform](https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Release](https://img.shields.io/github/v/release/namioto/dskube)

---

## Features

- **Multi-panel layout** — split the workspace horizontally or vertically, drag panels out into separate OS windows
- **Real-time watch** — kube-rs powered watch API, zero polling
- **Pod log streaming** — tail multiple pods simultaneously across panels
- **Resource management** — list, inspect, and apply YAML for Pods, Deployments, Services, ConfigMaps, Secrets, and more
- **kubeconfig integration** — auto-discovers `~/.kube/config`, switch clusters from the top bar
- **Lightweight** — under 20 MB binary, no Electron, no Node.js runtime
- **macOS native** — ships as a native app for Apple Silicon; no browser, no web server, behaves like a real desktop application

## Download

[**Download latest release →**](https://github.com/namioto/dskube/releases/latest)

Requires macOS with Apple Silicon (M1/M2/M3/M4).

### First launch

macOS will show a one-time security dialog for apps downloaded from the internet. Click **Open** to proceed.

## Development

### Prerequisites

- [Rust](https://rustup.rs)
- [Node.js 20+](https://nodejs.org)
- macOS with Xcode Command Line Tools

```bash
xcode-select --install
```

### Running locally

```bash
git clone https://github.com/namioto/dskube.git
cd dskube
npm install
npm run tauri dev
```

### Building

```bash
npm run tauri build
```

The `.dmg` will be at `src-tauri/target/release/bundle/dmg/`.

### Running tests

```bash
# Frontend
npm test

# Rust
cd src-tauri && cargo test
```

## Tech stack

| Layer | Technology |
|---|---|
| Desktop framework | [Tauri 2](https://tauri.app) |
| Backend | Rust + [kube-rs](https://kube.rs) |
| Frontend | React 18 + TypeScript |
| State | Zustand |
| Styling | TailwindCSS |

## License

MIT
