# 🎓 Magic English

<div align="center">

**AI-Powered Vocabulary Learning Desktop Application**

[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](LICENSE.txt)
[![Electron](https://img.shields.io/badge/Electron-31+-9FEAF9?logo=electron)](https://www.electronjs.org/)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows)](https://github.com/yourusername/desktop_vocab/releases)

*Learn vocabulary smarter with AI-powered insights and gamified progress tracking*

[Download](https://github.com/yourusername/desktop_vocab/releases) • [Features](#-features) • [Installation](#-installation) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🤖 **AI-Powered Learning**
- **Smart Word Analysis**: Get instant definitions, translations, examples, and usage tips
- **Sentence Scoring**: AI evaluates your sentences and provides detailed feedback
- **Magic Search**: Quick lookup from anywhere with a floating search window

### 📚 **Vocabulary Management**
- **Multiple Databases**: Organize words by topics, courses, or projects
- **Rich Word Details**: Store definitions, Vietnamese translations, examples, and notes
- **Flexible Database Paths**: Choose where to store your vocabulary databases

### 📊 **Progress Tracking**
- **Learning Streaks**: Track daily learning habits with streak counters
- **Activity Calendar**: Visualize your learning activity over time
- **Statistics Dashboard**: Monitor words learned, sentences scored, and more
- **Achievement System**: Unlock badges as you reach milestones

### 🎨 **Beautiful UI/UX**
- **Modern Design**: Clean, professional interface with smooth animations
- **Dark/Light Themes**: Choose your preferred color scheme
- **Responsive Layout**: Optimized for various screen sizes
- **Keyboard Shortcuts**: Power-user features for faster workflows

### 🌍 **Multi-language Support**
- English interface with Vietnamese translations
- Extensible i18n system for additional languages

---

## 📥 Installation

### Option 1: Download Release (Recommended)

1. Go to [Releases](https://github.com/yourusername/desktop_vocab/releases)
2. Download `Magic English-1.0.0-win-x64.exe`
3. Run the installer and follow the wizard
4. Launch **Magic English** from Start Menu or Desktop

### Option 2: Portable Version

1. Download `Magic English-portable.exe`
2. Place it in your preferred folder
3. Run directly - no installation needed!

### Option 3: Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/desktop_vocab.git
cd desktop_vocab

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build:win
```

---

## 🚀 Quick Start

1. **Launch the app** - Choose or create your first vocabulary database
2. **Add your first word** - Type a word and click "Search & Add"
3. **AI analyzes it** - Get instant definitions, examples, and translations
4. **Build your streak** - Come back daily to maintain your learning habit
5. **Track progress** - Check Stats & Streaks tab to see your growth

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Electron 31+, Node.js 20+ |
| **AI/ML** | Ollama Cloud API (Claude Sonnet 4.5) |
| **Storage** | JSON-based databases with file system operations |
| **UI** | Vanilla JavaScript, CSS3 with custom properties |
| **Build** | electron-builder, NSIS for Windows installer |
| **Development** | electronmon for hot-reload, Prettier for formatting |

---

## 📁 Project Structure

```
desktop_vocab/
├── electron/               # Main process
│   ├── main.js            # App entry point
│   ├── preload.cjs        # IPC bridge
│   ├── ipcHandlers.js     # IPC handlers
│   └── services/          # Business logic
│       ├── jsonStore.js   # Database management
│       ├── userProfileStore.js  # User data & achievements
│       ├── dbPathsStore.js      # Path management
│       └── claudeService.js     # AI client
├── src/
│   ├── renderer/          # Renderer process (main UI)
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── magic-search/      # Floating search window
│       ├── magic-search.html
│       ├── magic-search.js
│       └── magic-search-claude.css
├── static/                # Assets (icons, images)
├── scripts/               # Build automation
├── .github/workflows/     # CI/CD automation
└── package.json
```

---

## 🔧 Development

### Prerequisites
- Node.js 20+ and npm
- Windows 10/11 (for building Windows installer)
- ImageMagick (for icon generation): `choco install imagemagick`

### Setup

```bash
# Install dependencies
npm install

# Run in development mode with hot-reload
npm run dev

# Run in production mode
npm start

# Format code
npm run format

# Lint code
npm run lint
```

### Building

```bash
# Build installer (x64)
npm run build:win

# Build 32-bit installer
npm run build:win32

# Build portable version
npm run build:portable

# Build unpacked directory only
npm run build:dir
```

Output will be in `build-output/` folder.

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Changelog

See [RELEASE.md](RELEASE.md) for detailed version history.

---

## 📄 License

This project is licensed under the **BSD 3-Clause License** - see [LICENSE.txt](LICENSE.txt) for details.

---

## 🙏 Acknowledgments

- **Ollama Cloud** for providing the AI API
- **Electron** team for the amazing framework
- **Claude Sonnet 4.5** for powering the AI features
- All contributors and users of Magic English

---

## 📧 Support

- 🐛 [Report a bug](https://github.com/yourusername/desktop_vocab/issues/new?labels=bug)
- 💡 [Request a feature](https://github.com/yourusername/desktop_vocab/issues/new?labels=enhancement)
- 💬 [Discuss](https://github.com/yourusername/desktop_vocab/discussions)

---

<div align="center">

**Made with ❤️ by Alphatitan**

⭐ Star this repo if you find it helpful!

</div>
