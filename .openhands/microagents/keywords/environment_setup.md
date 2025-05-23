---
keywords: [environment, configuration, setup, env, .env, variables]
---

# Environment Configuration Guide

## Environment Variables Setup

This project uses environment variables to configure various services and features. Environment variables are divided into two categories:

1. **Public Environment Variables**: Stored in `.env` file, can be committed to version control
2. **Sensitive Environment Variables**: Stored in `.env.local` file, should not be committed to version control

### Creating Environment Variable Files

1. Copy `.env.example` file to `.env`
2. Create a new `.env.local` file for sensitive information

```bash
cp .env.example .env
touch .env.local
```

### Required Environment Variables

#### VolcEngine Text-to-Speech

```
NUXT_VOLCENGINE_APPID=your_app_id
NUXT_VOLCENGINE_ACCESS_TOKEN=your_access_token
NUXT_VOLCENGINE_SECRET_KEY=your_secret_key
NUXT_VOLCENGINE_CLUSTER=your_cluster
VOLCENGINE_VOICE_TYPE=BV001_streaming  # Optional, default value
```

#### ElevenLabs

```
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_DEFAULT_MODEL_ID=eleven_flash_v2_5
```

#### Supabase

```
SUPABASE_URL=https://jazocztbwzavmtyprhye.supabase.co
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

#### Other AI Services

```
OPENROUTER_API_KEY=your_openrouter_api_key
GROQ_API_KEY=your_groq_api_key
```

## Development Environment Setup

### Node.js Environment

The project uses pnpm as package manager, requires Node.js environment:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Python Environment

For Python script components, requires Python 3.6 or higher:

```bash
# Install dependencies
pip install requests python-dotenv

# Run example script
python volcengine_tts_demo.py
```

## Production Environment Deployment

The project supports multiple deployment methods:

### Vercel Deployment

```bash
pnpm build:vercel
```

### Docker Deployment

The project includes Dockerfile and docker-compose.yml for Docker deployment:

```bash
docker-compose up -d
```

## Common Issues

1. **Environment Variables Not Loading**: Ensure environment variable files are in the project root directory with correct format
2. **API Key Errors**: Check if API keys are correct and have sufficient permissions
3. **Dependency Installation Failed**: Try clearing cache and reinstalling `pnpm store prune && pnpm install`