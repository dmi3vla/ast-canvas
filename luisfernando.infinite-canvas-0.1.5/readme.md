# Infinite Canvas for VS Code

> 🎨 **A powerful visual canvas editor for VS Code with full Obsidian Canvas compatibility**  
> Create infinite mind maps, diagrams, and visual workflows with AI-powered content generation and markdown support. Works seamlessly with Obsidian Canvas files.

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=LuisFernando.infinite-canvas)
[![Obsidian Compatible](https://img.shields.io/badge/Obsidian-Canvas%20Compatible-7c3aed?logo=obsidian)](https://obsidian.md/canvas)
[![Version](https://img.shields.io/badge/version-0.1.1-green)](https://github.com/lout33/infinite_canvas_vscode/releases)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/lout33/infinite_canvas_vscode/blob/HEAD/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/lout33/infinite_canvas_vscode?style=social)](https://github.com/lout33/infinite_canvas_vscode)

![Infinite Canvas Demo](https://github.com/lout33/infinite_canvas_vscode/raw/HEAD/gif_reference.gif)

---

## Features

### 🔗 Obsidian Canvas Compatibility
- **Native format**: Uses the same `.canvas` format as [Obsidian Canvas](https://obsidian.md/canvas)
- **Bidirectional**: Files work seamlessly between VS Code and Obsidian
- **Import/Export**: Open existing Obsidian canvas files directly in VS Code
- **Perfect sync**: Create in VS Code, edit in Obsidian, or vice versa
- **Knowledge management**: Perfect for PKM (Personal Knowledge Management) workflows

### 🎨 Visual Canvas Editor
- **Infinite workspace**: Create and organize content on an unlimited canvas
- **Intuitive interactions**: Double-click to create, drag to move, mouse wheel to zoom
- **Node-based editing**: Create text nodes and connect them with visual relationships
- **File integration**: Drag & drop workspace files to create reference nodes

### 🤖 AI-Powered Content Generation
- **Generate Ideas**: Click the "✨ Generate Ideas" button to generate connected content
- **Multiple AI Models**: Choose from Google Gemini, OpenAI GPT-4, Anthropic Claude, and more via OpenRouter
- **Smart Context**: Uses connected nodes as conversation history for relevant suggestions
- **Free to use**: Works with OpenRouter API or falls back to mock responses

### 📝 Rich Text & Markdown Support
- **Markdown rendering**: Full markdown support with headings, lists, bold, italic
- **Live formatting**: See markdown rendered in real-time on your canvas
- **File editing**: Double-click `.md` file nodes to edit content directly
- **Auto-save**: Changes save automatically to your workspace files

## Quick Start

1. **Install** the extension from the VS Code marketplace
2. **Create** a new `.canvas` file in your workspace
3. **Double-click** the file to open it with Infinite Canvas
4. **Double-click** on empty space to create your first text node
5. **Start creating** your visual workspace!

## Usage Guide

### Creating Content
- **New text node**: Double-click on empty canvas space
- **Edit text**: Double-click on any text node to edit inline
- **Create connections**: Hold Shift and drag between nodes
- **Add files**: Drag files from VS Code explorer to canvas

### Navigation
- **Pan**: Drag the background to move around
- **Zoom**: Use mouse wheel to zoom in/out
- **Select**: Click nodes to select them
- **Delete**: Press Delete key to remove selected nodes

### AI Features
1. **Select a node** you want to expand on
2. **Click "✨ Generate Ideas"** in the AI panel
3. **Choose AI models** using the checkboxes
4. **Watch** as connected ideas appear automatically

### Settings
- **OpenRouter API Key**: Add your API key in VS Code settings for AI features
  - Go to Settings → Extensions → Infinite Canvas
  - Add your API key from [openrouter.ai](https://openrouter.ai)
  - Leave empty to use mock responses

## File Format

Infinite Canvas uses the standard Obsidian canvas format:

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "x": 100,
      "y": 100,
      "width": 250,
      "height": 60,
      "type": "text",
      "text": "Your content here"
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "fromNode": "node-1",
      "fromSide": "bottom",
      "toNode": "node-2",
      "toSide": "top"
    }
  ]
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Double-click` | Create/edit nodes |
| `Drag` | Move nodes or pan canvas |
| `Mouse wheel` | Zoom in/out |
| `Delete` | Remove selected nodes |
| `Shift + drag` | Create connections |
| `Ctrl+Enter` | Save when editing |
| `Esc` | Cancel editing |

## Requirements

- VS Code 1.74.0 or higher
- Optional: OpenRouter API key for AI features ([Get one here](https://openrouter.ai))

## Extension Settings

This extension contributes the following settings:

* `infinite-canvas.groqApiKey`: Your OpenRouter API key for AI-powered idea generation (optional)

## Known Issues

- AI features require internet connection
- Large canvases may impact performance on older machines

## Release Notes

### 0.1.1

Enhanced Obsidian compatibility and marketplace discoverability:

- 🔗 Improved Obsidian Canvas compatibility documentation
- 🎯 Enhanced marketplace keywords for better discoverability
- 📸 Added demo image reference
- 📝 Updated descriptions to highlight Obsidian integration
- 🏷️ Added PKM (Personal Knowledge Management) workflow support

### 0.1.0

Initial release of Infinite Canvas extension:

- ✨ Visual canvas editor for `.canvas` files
- 🤖 AI-powered content generation via OpenRouter
- 📝 Rich markdown rendering and file editing support
- 🔗 Full Obsidian Canvas compatibility ([obsidian.md/canvas](https://obsidian.md/canvas))
- ⚡ Smooth navigation and interactions

## Contributing

Found a bug or have a feature request? Please visit our [GitHub repository](https://github.com/lout33/infinite_canvas_vscode).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🚀 Installation

### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Infinite Canvas"
4. Click Install

### Manual Installation
1. Download the latest `.vsix` from [Releases](https://github.com/lout33/infinite_canvas_vscode/releases)
2. Install via: `code --install-extension infinite-canvas-0.1.0.vsix`

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](https://github.com/lout33/infinite_canvas_vscode/blob/HEAD/CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Clone repository
git clone https://github.com/lout33/infinite_canvas_vscode.git
cd infinite_canvas_vscode

# Install dependencies
npm install

# Build extension
npm run compile

# Package extension (optional)
npm install -g @vscode/vsce
vsce package
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/lout33/infinite_canvas_vscode/blob/HEAD/LICENSE) file for details.

---

**Enjoy creating with Infinite Canvas!** 🎨✨

*Made with ❤️ by the Infinite Canvas Team*  