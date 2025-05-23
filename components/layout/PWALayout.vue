<template>
  <div 
    class="pwa-layout"
    :class="{
      'pwa-mode': isPWA,
      'ios-device': isIOS,
      'safe-area-all': isPWA,
      'mobile-vh-100': isMobile
    }"
  >
    <!-- PWA Header -->
    <header 
      v-if="showHeader" 
      class="pwa-header"
      :style="headerStyle"
    >
      <slot name="header">
        <div class="flex items-center justify-between p-4">
          <h1 class="text-lg font-semibold">{{ title || 'Hugo Tour Dashboard' }}</h1>
          <slot name="header-actions" />
        </div>
      </slot>
    </header>

    <!-- Main Content -->
    <main 
      class="pwa-content flex-1"
      :style="mainStyle"
    >
      <slot />
    </main>

    <!-- PWA Footer -->
    <footer 
      v-if="showFooter" 
      class="pwa-footer"
      :style="footerStyle"
    >
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { usePWASafeArea } from '~/composables/usePWASafeArea';

interface Props {
  title?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  headerFixed?: boolean;
  footerFixed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showFooter: false,
  headerFixed: false,
  footerFixed: false
});

const { safeAreaInsets, isPWA, isIOS } = usePWASafeArea();
const { width } = useWindowSize();

const isMobile = computed(() => width.value < 768);

// Header样式
const headerStyle = computed(() => {
  const style: Record<string, string> = {};
  
  if (isPWA.value && props.headerFixed) {
    style.position = 'fixed';
    style.top = '0';
    style.left = '0';
    style.right = '0';
    style.zIndex = '50';
  }
  
  return style;
});

// Main content样式
const mainStyle = computed(() => {
  const style: Record<string, string> = {};
  
  if (isPWA.value) {
    if (props.headerFixed && props.showHeader) {
      style.paddingTop = '64px'; // 为固定header留出空间
    }
    if (props.footerFixed && props.showFooter) {
      style.paddingBottom = '64px'; // 为固定footer留出空间
    }
    
    // 确保内容不被安全区域遮挡
    style.minHeight = `calc(100vh - ${safeAreaInsets.value.top}px - ${safeAreaInsets.value.bottom}px)`;
  }
  
  return style;
});

// Footer样式
const footerStyle = computed(() => {
  const style: Record<string, string> = {};
  
  if (isPWA.value && props.footerFixed) {
    style.position = 'fixed';
    style.bottom = '0';
    style.left = '0';
    style.right = '0';
    style.zIndex = '50';
  }
  
  return style;
});
</script>

<style scoped>
.pwa-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* PWA模式下的特殊样式 */
.pwa-mode {
  min-height: 100vh;
  min-height: calc(var(--vh, 1vh) * 100);
}

.pwa-mode.ios-device {
  /* iOS设备特殊处理 */
  min-height: -webkit-fill-available;
}

/* 移动端优化 */
@media screen and (max-width: 768px) {
  .pwa-layout {
    min-height: calc(var(--vh, 1vh) * 100);
    min-height: -webkit-fill-available;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .pwa-header,
  .pwa-footer {
    -webkit-user-select: none;
    user-select: none;
  }
}
</style> 