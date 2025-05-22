---
keywords: [nuxt, vue, frontend, dashboard, components, ui]
---

# Nuxt.js Project Structure & Development Guide

## Project Overview

This project is built with Nuxt.js 3 framework, a modern frontend application that integrates multiple text-to-speech services including VolcEngine, ElevenLabs, Google, and more. The project uses the following tech stack:

- Nuxt.js 3: Full-stack Vue.js framework
- Tailwind CSS v4: For styling (utility-first CSS)
- Pinia: State management
- Supabase: Backend services and storage
- TypeScript: Type safety
- Shadcn/Vue: UI component library

## Project Structure

Key directories and files:

- `components/`: Vue components (auto-imported)
  - `components/ui/`: Shadcn/Vue UI components (auto-imported)
- `composables/`: Reusable composition functions (auto-imported)
- `pages/`: Application pages
- `stores/`: Pinia state management
- `public/`: Static assets
- `server/`: Server-side API
- `types/`: TypeScript type definitions
- `nuxt.config.ts`: Nuxt configuration file
- `app.vue`: Application entry component

## Development Guidelines

### Start Development Server

```bash
pnpm dev
```

This starts the development server on port 4000.

### Build Project

```bash
pnpm build
```

For production build.

### Type Checking

```bash
pnpm lint
```

Run TypeScript type checking.

### Generate Supabase Types

```bash
pnpm types:gen
```

Generate TypeScript type definitions from Supabase.

## Important Coding Standards

### Auto-Imports
- UI components from `components/ui/` are auto-imported by Nuxt
- Common composables are auto-imported
- **DO NOT manually import these** (causes errors/redundancy)

### UI Components
- Prioritize existing Shadcn/Vue components from `components/ui/`
- If no suitable component exists, discuss creating a new reusable component

### Icon Usage
Use the Icon component with Phosphor Icons:
```vue
<Icon name="ph:icon-name-here" class="your-tailwind-classes" />
```
Example: `<Icon name="ph:check-circle" class="w-5 h-5 text-green-500" />`

### Styling (Tailwind CSS v4)
- Use only Tailwind utility classes for styling
- Use Tailwind color palette classes (e.g., `text-primary`, `bg-destructive`) NOT hex/named colors
- Custom colors/themes are via CSS variables or `@theme` in main CSS, not `tailwind.config.js`

## Environment Variables

The project uses `.env` and `.env.local` files for environment variable management. Sensitive information should be placed in `.env.local` and not committed to version control.

Key environment variables include:
- Various API keys (ElevenLabs, OpenRouter, Groq, etc.)
- Supabase configuration
- Storage provider configuration
- TTS service configuration

## Integrated Services

The project integrates multiple text-to-speech services:

1. VolcEngine TTS
2. ElevenLabs
3. Google Gemini
4. Other AI services

## Best Practices

1. Follow Vue.js and Nuxt.js best practices
2. Use TypeScript for type-safe development
3. Use Pinia for state management
4. Keep sensitive information in `.env.local`, don't commit to version control
5. Use Composition API and composables for logic reuse
6. Adhere to project-specific coding standards (auto-imports, UI components, styling)