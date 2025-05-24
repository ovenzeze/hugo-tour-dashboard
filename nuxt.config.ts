import tailwindcss from "@tailwindcss/vite";
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  ssr: false,
  devServer: {
    port: 4000,
  },
  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiImageModel: process.env.GEMINI_IMAGE_MODEL,
    volcengine: { // Added Volcengine config block
      appId: process.env.NUXT_VOLCENGINE_APP_ID,
      accessToken: 'AcessToken', // Using Access Token as Access Key ID for Bearer header
      cluster: process.env.NUXT_VOLCENGINE_CLUSTER,
      instanceId: process.env.NUXT_VOLCENGINE_INSTANCE_ID || 'Speech_Synthesis_Default_InstanceID',
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY,
      baseUrl:
        process.env.ELEVENLABS_API_BASE_URL || "https://api.elevenlabs.io/v1",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL,
      referer: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    public: {
      openrouterDefaultModel: process.env.OPENROUTER_MODEL,
      groqDefaultModel: process.env.GROQ_MODEL,
      volcengineVoiceType: process.env.NUXT_VOLCENGINE_VOICE_TYPE,
      elevenlabsDefaultVoiceId:
        process.env.ELEVENLABS_DEFAULT_VOICE_ID || "pNInz6obpgDQGcFmaJgB",
      elevenlabsDefaultModelId:
        process.env.ELEVENLABS_DEFAULT_MODEL_ID || "eleven_multilingual_v2",
      supabase: {},
      storageProvider: process.env.NUXT_PUBLIC_STORAGE_PROVIDER || "local", // Ensure this is read from env
      supabaseStorageBucketName:
        process.env.SUPABASE_STORAGE_BUCKET_NAME || "guide-voices",
    },
  },
  devtools: { enabled: false },
  css: ["~/assets/css/tailwind.css"],

  components: {
    dirs: [
      {
        path: "~/components",
        ignore: ["**/*/index.ts"],
      },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
    optimizeDeps: {
      include: [
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'reka-ui',
        'lucide-vue-next',
        'hls.js',
        'vee-validate',
        'date-fns',
        'qrcode-vue3',
        '@unovis/ts',
        '@unovis/vue',
        '@vee-validate/zod',
        'zod',
        '@iconify/vue'
      ]
    },
  },

  nitro: {
    publicAssets: [
      {
        baseURL: "docs",
        dir: "docs",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      },
    ],
    serverAssets: [
      {
        baseName: "docs",
        dir: "./docs",
      },
    ],
  },

  modules: [
    "@vueuse/nuxt",
    "@vueuse/motion/nuxt",
    "@nuxtjs/google-fonts",
    "@pinia/nuxt",
    "@nuxt/icon",
    "shadcn-nuxt",
    "@vite-pwa/nuxt",
    "@nuxtjs/supabase",
    "@nuxt/content",
  ],

  content: {
    experimental: {
      // clientDB: false, // Removed due to TS error, check @nuxt/content docs if this feature is needed
    },
    // @ts-ignore // Temporary fix for potential type mismatch with @nuxt/content version
    documentDriven: true,
    storage: {
      fs: {
        driver: "fs",
      },
    },
    ignores: ["better-sqlite3"],
  },

  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },

  googleFonts: {
    // @ts-ignore
    families: {
      "Crimson Text": [400, 600, 700],
      "Noto Serif SC": [300, 400, 500, 600, 700],
      "Noto Sans SC": [300, 400, 500, 600, 700, 900],
    },
    subsets: ["latin", "chinese-simplified"],
    download: true,
    preload: true,
    useStylesheet: true,
    display: 'swap',
  },
  app: {
    head: {
      charset: "utf-8",
      viewport:
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimum-scale=1, viewport-fit=cover",
      meta: [
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "Hugo Tour Dashboard" },
        { name: "theme-color", content: "#ffffff" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "format-detection", content: "telephone=no" },
      ],
      link: [
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/images/icons/favicons/apple-touch-icon.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/images/icons/favicons/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/images/icons/favicons/favicon-16x16.png",
        },
        { rel: "manifest", href: "/manifest.json" },
        {
          rel: "mask-icon",
          href: "/images/icons/favicons/safari-pinned-tab.svg",
          color: "#5bbad5",
        },
        {
          rel: "apple-touch-startup-image",
          href: "/images/icons/favicons/apple-touch-icon.png",
        },
      ],
    },
    layoutTransition: {
      name: "page",
      mode: "out-in",
    },
  },
  plugins: [],
  // @ts-ignore - Ignore TS error as shadcn-nuxt module should handle this config key
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },
  // @ts-ignore - Ignore TS error as vite-pwa module should handle this config key
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Hugo Tour Dashboard",
      short_name: "HugoDash",
      description: "Hugo Tour Dashboard App",
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      lang: "en",
      start_url: "/?source=pwa",
      icons: [
        {
          src: "/images/icons/favicons/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/images/icons/favicons/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/images/icons/favicons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "apple touch icon",
        },
        {
          src: "/images/icons/favicons/maskable-icon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      globIgnores: ["**/node_modules/**/*", "**/_payload.json"],
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB
    },
    devOptions: {
      enabled: false, // 开发环境禁用 PWA
      suppressWarnings: true,
    },
    strategies: "generateSW",
    // 完全禁用会导致错误的功能
    includeAssets: [],
    registerWebManifestInRouteRules: false,
    client: {
      registerPlugin: false, // 不注册客户端插件
      installPrompt: false, // 禁用安装提示
    },
  },
});
