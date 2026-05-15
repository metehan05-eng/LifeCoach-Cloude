# 🚀 HAN Code IDE - Setup Guide

## Overview
HAN Code IDE is a powerful AI-driven software development environment integrated into LifeCoach AI. It allows users to generate, preview, and iterate on software projects with visual IDE-like interface powered by Qwen (Singapore region).

## Features

### ⚔️ Elite Code Generation
- **Mobile Apps**: React Native/Expo with iOS/Android previews
- **Web Apps**: React/Next.js/Vue with responsive design
- **Desktop Apps**: Electron/Tauri with native support
- **Backend APIs**: Node.js/Python with full architecture
- **Games**: Phaser.js/Three.js with game canvas

### 🎨 Emergent Labs-Style UI
- Split-screen code editor and preview panel
- File tree with syntax highlighting
- Interactive project setup wizard
- Real-time chat with HAN Code AI
- Device mockups (iPhone, desktop, mobile preview)

### 🧠 Qwen AI Integration
- **Model Chain**: qwen-plus → qwen-turbo → qwen-flash
- **Region**: Singapore (dashscope-sg.aliyuncs.com)
- **Temperature**: 0.2 (deterministic code generation)
- **Max Tokens**: 8192 per request

## Configuration

### 1. Environment Variables

Update your `.env.local` file:

```bash
# HAN Code - Qwen DashScope (Singapore Region)
DASHSCOPE_API_KEY="your-dashscope-api-key-here"
QWEN_MODELS="qwen-plus|qwen-turbo|qwen-flash"

# Optional: Fallback Models
OPENROUTER_API_KEY="your-openrouter-key"
DEEPSEEK_API_KEY="your-deepseek-key"
GROQ_API_KEY="your-groq-key"
GEMINI_API_KEY="your-gemini-key"
```

### 2. Get Qwen API Key

1. Go to [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/)
2. Create account and select Singapore region
3. Generate API key
4. Copy to `.env.local` as `DASHSCOPE_API_KEY`

### 3. File Structure

```
app/
├── hancode/
│   └── page.jsx              # HAN Code page
chat/
└── SettingsModal.jsx         # Updated with HAN Code link
components/
├── HanCodeStudio.jsx         # Main IDE component
├── HanCodeStudio.module.css
├── HanCodeIDEViewer.jsx      # Code/Preview viewer
├── HanCodeIDEViewer.module.css
└── chat/
    └── ChatHeader.jsx        # Added HAN Code button
pages/api/
└── hancode.js                # Backend with Qwen integration
```

## Usage

### For Users

1. **Access HAN Code**:
   - Click ⚙️ (Settings) in chat header
   - Select "HAN Code" tab
   - Click "🚀 HAN Code IDE'ye Git"
   - OR click ⚔️ button in chat header

2. **Create Project**:
   - Choose project type (Mobile/Web/Desktop/Backend/Game)
   - Fill project name and description
   - Click "🚀 Generate Project"
   - Wait for AI to generate code
   - View code in split-screen editor
   - See preview on device mockup

3. **Iterate**:
   - Chat with HAN Code in "Chat" tab
   - Request modifications, new features, bug fixes
   - Preview updates in real-time

### For Developers

#### Backend Response Format
```json
{
  "message": "Full code response",
  "response": "Full code response (frontend format)",
  "reply": "Full code response (alternative)",
  "fileBlocks": [
    {
      "filename": "src/App.jsx",
      "content": "..."
    }
  ],
  "hasFiles": true,
  "model": "qwen-plus",
  "usedModel": "qwen-plus",
  "success": true
}
```

#### API Endpoint
```
POST /api/hancode
Content-Type: application/json

{
  "message": "Create a React app...",
  "email": "user@example.com",
  "projectType": "web|mobile|desktop|backend|game",
  "mode": "create|debug|optimize|explain",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

## Troubleshooting

### Qwen API Not Responding
1. Check `DASHSCOPE_API_KEY` is valid
2. Verify Singapore region endpoint: `dashscope-sg.aliyuncs.com`
3. Check rate limits on Alibaba Cloud console
4. Fallback models will auto-activate if Qwen fails

### Code Generation Issues
1. Ensure project description is detailed
2. Check temperature setting (0.2 for deterministic results)
3. Use specific programming languages
4. Provide context/existing code if needed

### Preview Not Loading
1. Mobile preview requires valid React/Vue code
2. Backend preview shows API structure only
3. Desktop apps show code structure
4. Web apps need HTML/CSS/JS

## Architecture

### Frontend Flow
```
ChatHeader.jsx (⚔️ button)
    ↓
/hancode route → HanCodeStudio.jsx
    ↓
Project Selection → Setup → Chat → Preview
    ↓
HanCodeIDEViewer.jsx (split-screen)
    ↓
Code Panel + Device Mockup
```

### Backend Flow
```
/api/hancode endpoint
    ↓
Qwen DashScope (Singapore)
    ↓
Model Chain: qwen-plus → qwen-turbo → qwen-flash
    ↓
Fallback: OpenRouter → Deepseek → Groq → Gemini
    ↓
Parse code blocks → Return JSON response
    ↓
Frontend renders code + preview
```

## Performance Tips

1. **Temperature 0.2**: Ensures consistent, production-ready code
2. **Max Tokens 8192**: Balance between quality and response time
3. **Singapore Region**: Faster access from Asia-Pacific
4. **Model Chain**: Qwen-plus (best) → Qwen-turbo (balanced) → Qwen-flash (fast)

## Language Support

- **System Language**: Turkish (Türkçe)
- **UI Language**: English
- **AI Model**: Qwen (multilingual support)
- **Code Generation**: All major languages (JavaScript, Python, TypeScript, etc.)

## Next Steps

1. Add project export/download feature
2. Implement GitHub integration for auto-commit
3. Add code beautification (Prettier)
4. Implement live preview iframe
5. Add project versioning/history
6. Enable collaborative editing
7. Add code quality metrics
8. Implement deployment guides

---

**Created**: May 15, 2026  
**Powered by**: Qwen + LifeCoach AI + Emergent Labs UI Design
