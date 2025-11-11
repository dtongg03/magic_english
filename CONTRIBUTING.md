# Contributing to Magic English

Thank you for your interest in contributing to Magic English! 🎉

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/desktop_vocab.git
   cd desktop_vocab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm start
   # or with auto-reload
   npm run dev
   ```

## Project Structure

```
desktop_vocab/
├── electron/           # Main process code
│   ├── main.js        # Electron entry point
│   ├── preload.cjs    # Preload script for IPC
│   ├── ipcHandlers.js # IPC handlers
│   └── services/      # Business logic services
├── src/
│   ├── renderer/      # Renderer process (UI)
│   └── magic-search/  # Magic Search floating window
├── static/            # Static assets
└── scripts/           # Build scripts
```

## Building

- **Development**: `npm start`
- **Production**: `npm run build:win`
- **Portable**: `npm run build:portable`

## Code Style

- Use Prettier for formatting: `npm run format`
- Check formatting: `npm run lint`

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## Reporting Issues

Please use GitHub Issues to report bugs or request features.

Include:
- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- System information (OS, version)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE.txt).

