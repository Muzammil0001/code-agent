# CodeMind AI - Setup, Test & Publish Guide

## 🚀 Quick Setup (5 Minutes)
 
### 1. Install Dependencies

```bash
cd /Users/app/Documents/test-projects/code-agent
npm install
```

This installs 856 packages including TypeScript, Webpack, and all AI SDKs.

### 2. Build the Extension

```bash
npm run build:extension
```

**Expected output:**
```
✓ Webpack bundle created: dist/extension.js (718 KB)
⚠ 8 warnings about tree-sitter (safe to ignore)
```

---

## 🧪 Test Locally

### Method 1: Press F5 (Easiest)

1. Open this project in VS Code
2. Press `F5` (or Run → Start Debugging)
3. A new "Extension Development Host" window opens
4. Extension is now running!

### Method 2: Install .vsix File

```bash
# Package extension
npm install -g @vscode/vsce
vsce package

# Install locally
code --install-extension codemind-ai-1.0.0.vsix
```

### Configure API Key

In the Extension Development Host window:

1. Open Settings: `Cmd+,` (Mac) or `Ctrl+,` (Windows)
2. Search for "CodeMind"
3. Add at least one API key:

**Get Free API Keys:**
- **Groq** (Recommended): https://console.groq.com
- **DeepSeek**: https://platform.deepseek.com  
- **Gemini**: https://makersuite.google.com/app/apikey

### Test Features

**Open Panel:**
```
Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)
```

**Generate Code:**
```
Cmd+Shift+G → Type: "Create a React login component"
```

**Explain Code:**
```
Select code → Cmd+Shift+E
```

**All Commands:**
- Open Command Palette: `Cmd+Shift+P`
- Type: "CodeMind"
- Try all commands

---

## 📦 Publish for Others to Use

### Option 1: VS Code Marketplace (Public)

**Best for:** Anyone can install from VS Code Extensions

```bash
# 1. Install publisher tool
npm install -g @vscode/vsce

# 2. Create publisher account
# Visit: https://marketplace.visualstudio.com/manage
# Sign in with Microsoft account

# 3. Get Personal Access Token
# Visit: https://dev.azure.com
# User Settings → Personal Access Tokens
# Create token with "Marketplace (Manage)" scope

# 4. Login
vsce login YOUR-PUBLISHER-NAME

# 5. Update package.json
# Change "publisher": "codemind" to "publisher": "YOUR-PUBLISHER-NAME"

# 6. Package and publish
vsce package
vsce publish
```

**Result:** Extension available at:
```
https://marketplace.visualstudio.com/items?itemName=YOUR-PUBLISHER-NAME.codemind-ai
```

**Users install with:**
- Open VS Code
- Go to Extensions (Cmd+Shift+X)
- Search "CodeMind AI"
- Click Install

---

### Option 2: Share .vsix File (Private)

**Best for:** Share with specific people, teams, or beta testers

```bash
# 1. Package extension
npm install -g @vscode/vsce
vsce package
# Creates: codemind-ai-1.0.0.vsix

# 2. Share file via:
# - Email
# - Google Drive / Dropbox
# - Slack / Teams
# - GitHub Releases
```

**Users install with:**

**Method A - Command Line:**
```bash
code --install-extension codemind-ai-1.0.0.vsix
```

**Method B - VS Code UI:**
1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Click `...` menu (top right)
4. Select "Install from VSIX..."
5. Choose the .vsix file

---

### Option 3: GitHub Releases

**Best for:** Open source projects with version tracking

```bash
# 1. Package extension
vsce package

# 2. Create GitHub release
git tag v1.0.0
git push origin v1.0.0

# 3. On GitHub:
# - Go to Releases → Create new release
# - Upload codemind-ai-1.0.0.vsix
# - Publish release
```

**Users download from:**
```
https://github.com/Muzammil0001/code-agent/releases
```

---

## ✅ Pre-Publish Checklist

Before publishing, verify:

- [ ] Extension builds successfully (`npm run build:extension`)
- [ ] Tested in Extension Development Host (F5)
- [ ] All commands work
- [ ] At least one AI model works (with API key)
- [ ] No console errors
- [ ] README.md is complete
- [ ] Version number is correct in package.json
- [ ] Publisher name is set in package.json

---

## 🔧 Troubleshooting

### Build Errors

**Error: Cannot find module**
```bash
npm install
npm run build:extension
```

**TypeScript errors:**
```bash
npm run compile
```

### Extension Not Loading

```bash
# Rebuild
npm run build:extension

# Restart VS Code
# Press F5 again
```

### No AI Responses

- Check API key in Settings → CodeMind
- Verify internet connection
- Try different model in settings

---

## 📊 What You Built

- **52 TypeScript files** - Complete extension
- **6 AI Agents** - Planner, Coder, Reviewer, Test, Documentation, Image-to-Code
- **10+ AI Models** - Groq, DeepSeek, Gemini, OpenAI, Claude, Ollama, LM Studio
- **Complete Safety System** - Permission dialogs for all risky operations
- **Deep Codebase Intelligence** - AST parsing, dependency graphs, framework detection
- **Real-time Features** - Inline suggestions, streaming responses
- **Interactive UI** - Dashboard panel with live updates

---

## 🎯 Quick Commands Reference

| Command | Shortcut | Description |
|---------|----------|-------------|
| Open Panel | `Cmd+Shift+M` | Open CodeMind dashboard |
| Generate Code | `Cmd+Shift+G` | AI code generation |
| Explain Code | `Cmd+Shift+E` | Explain selected code |

**All Commands:**
- `CodeMind: Generate Code`
- `CodeMind: Explain Code`
- `CodeMind: Refactor Code`
- `CodeMind: Generate Tests`
- `CodeMind: Generate Documentation`
- `CodeMind: Analyze Codebase`
- `CodeMind: Convert Image to Code`
- `CodeMind: Generate Commit Message`
- `CodeMind: Toggle Turbo Mode`
- `CodeMind: Toggle Inline Suggestions`

---

## 📞 Support

- **Issues:** https://github.com/Muzammil0001/code-agent/issues
- **Documentation:** See README.md and ARCHITECTURE.md
- **Examples:** Check examples/ folder

---

**Your extension is ready to use and share! 🎉**
