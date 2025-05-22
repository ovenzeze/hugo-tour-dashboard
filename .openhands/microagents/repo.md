---
agent: CodeActAgent
---

# VolcEngine TTS API Demo Project

This is a demo project for testing VolcEngine Text-to-Speech API with timestamp functionality. Built with Nuxt.js framework and integrates multiple TTS services including VolcEngine, ElevenLabs, Google, and more.

## Project Features

- Call VolcEngine TTS API to generate speech
- Support timestamp functionality to get pronunciation timing for each character
- Save generated audio files and timestamp information
- Detailed logging output including request and response details
- Integration support for multiple TTS services

## Environment Setup

### Python Requirements
- Python 3.6 or higher
- Install dependencies: `pip install requests python-dotenv`

### Nuxt.js Requirements
- Node.js environment
- Uses pnpm as package manager

## Environment Variables Configuration

The project requires the following environment variables:
- `NUXT_VOLCENGINE_APPID`: VolcEngine AppID
- `NUXT_VOLCENGINE_ACCESS_TOKEN`: VolcEngine Access Token
- `NUXT_VOLCENGINE_SECRET_KEY`: VolcEngine Secret Key
- `NUXT_VOLCENGINE_CLUSTER`: VolcEngine Cluster
- `VOLCENGINE_VOICE_TYPE`: Optional, defaults to "BV001_streaming"

Other service environment variables can be found in the `.env.example` file.

## Project Commands

- `pnpm build`: Build the project
- `pnpm dev`: Start development server (port 4000)
- `pnpm generate`: Generate static website
- `pnpm preview`: Preview built project
- `pnpm lint`: Run type checking

## Python Script Usage

You can directly run the Python script to test VolcEngine TTS API:

```bash
python volcengine_tts_demo.py
```

The script supports the following command line arguments:
- `--text`: Text to synthesize
- `--voice`: Choose voice type (female or male)
- `--output`: Output audio filename
- `--no-timestamps`: Disable timestamp functionality

## Important Notes

- Ensure you have applied for TTS service access permissions on the VolcEngine platform
- Move sensitive information and local-specific configurations to `.env.local` (this file should not be committed to version control)
- Timestamp functionality may require specific API permissions, please confirm your account has permission to use this feature