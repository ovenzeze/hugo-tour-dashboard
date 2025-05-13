<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster 
      position="top-right"  
      richColors
      :toastOptions="{
        duration: 4000
      }"
      class="toaster-safe-area opacity-90 hover:opacity-100 transition-opacity duration-300"
    />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { useColorMode } from '@vueuse/core'
import { usePwa } from '~/composables/usePwa'

const { isPwa } = usePwa()

// Set initial color mode to dark and apply 'dark' class to <html> element
useColorMode({
  initialValue: 'dark',
  selector: 'html',
  attribute: 'class',
  storageKey: null, // Set to null to not persist; or a key like 'theme-preference' to save user's choice
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'Hugo Tour Guide' },
    { name: 'msapplication-TileImage', content: '/images/icons/favicons/apple-touch-icon.png' },
    { name: 'msapplication-TileColor', content: '#ffffff' }
  ],
  link: [
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/icons/favicons/apple-touch-icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/icons/favicons/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/images/icons/favicons/favicon-16x16.png' }
  ]
})

// Register Toaster component with priority
</script>

<style>
:root {
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  font-feature-settings: normal;
  font-variation-settings: normal;
  -webkit-tap-highlight-color: transparent;
  font-family: "Crimson Text", Inter var, Inter, system-ui;
}

*::-webkit-scrollbar {
  display: none;
}

.noscrollbar::-webkit-scrollbar {
  width: 0.125rem;
  height: 0.125rem;
}

.noscrollbar::-webkit-scrollbar-track {
  border-radius: 9999px;
  background-color: #f3f4f6;
}

.noscrollbar::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: #f3f4f6;
}

/* for global page transition */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 可选:为不同设备优化动画 */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity 0.3s ease-in-out;
  }

  .page-enter-from,
  .page-leave-to {
    transform: none;
    filter: none;
  }
}

/* 为Toaster添加安全区域支持 */
.toaster-safe-area {
  --offset: env(safe-area-inset-top, 20px);
  margin-top: var(--offset);
  padding-right: env(safe-area-inset-right, 16px);
}
</style>
