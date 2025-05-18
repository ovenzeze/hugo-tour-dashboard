<template>
  <div >
    <SidebarProvider>
      <div class="relative flex flex-col md:flex-row w-full">
        <!-- 桌面端侧边栏 -->
        <ClientOnly>
          <aside class="sidebar-width fixed inset-y-0 z-10 transition-[left,right,width] duration-200 ease-linear md:flex left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l flex h-full max-h-screen flex-col bg-card">
            <SidebarNav :menuGroups="menuGroups" />
          </aside>
        </ClientOnly>

        <!-- 主体内容，包含实际页面内容 -->
        <div class="flex flex-col flex-1 md:ml-[var(--sidebar-width)]">
          <!-- PC端顶部栏 - 已移除 -->

          <!-- 移动端顶部栏 -->
          <header class="sticky top-0 z-40 flex h-16 items-center border-b bg-background px-4 md:hidden">
            <ClientOnly>
              <Sheet v-model:open="sidebarOpen">
                <SidebarTrigger as-child>
                  <Button variant="ghost" size="icon" class="mr-2">
                    <Icon name="ph:list" class="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
<SheetContent side="left" class="w-[320px] p-0">
  <SidebarNav :menuGroups="menuGroups" @close="sidebarOpen = false" collapsible="none" />
</SheetContent>
              </Sheet>
            </ClientOnly>
            <h1 class="text-lg font-semibold ml-3">{{ route.meta.title || 'Dashboard' }}</h1>
          </header>

          <!-- 主内容区 -->
          <main class="flex-1 flex flex-col pb-20 md:pb-0">
            <slot />
          </main>
        </div>

        <!-- 移动端底部导航 -->
        <MobileBottomBar />
      </div>
    </SidebarProvider>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from '#imports';
import MobileBottomBar from '@/components/layout/MobileBottomBar.vue';
import SidebarNav from '@/components/layout/SidebarNav.vue';

const route = useRoute()

// layouts/default.vue 脚本部分
const menuGroups = {
  overview: [
    { path: '/dashboard', label: 'Dashboard', icon: 'ph:chart-line' }
  ],
  content: [
        { path: '/playground', label: 'Playground', icon: 'ph:flask' },

    { path: '/podcasts', label: 'Podcasts', icon: 'ph:microphone' },
    { path: '/transcripts', label: 'Guide Texts', icon: 'ph:file-text' },
    { path: '/personas', label: 'Personas', icon: 'ph:user-circle' },
    { path: '/components', label: 'Components', icon: 'ph:puzzle-piece' }
  ],
  resources: [
    { path: '/museums', label: 'Museums', icon: 'ph:buildings' },
    { path: '/galleries', label: 'Galleries', icon: 'ph:images' },
    { path: '/objects', label: 'Objects', icon: 'ph:cube' }
  ],
  client: [
    { path: '/tour', label: 'Tour', icon: 'ph:map-trifold' },
    { path: '/chat', label: 'Chat', icon: 'ph:chat-circle' },
    { path: '/guide', label: 'Guide', icon: 'ph:book-open' }
  ],
  admin: [
    { path: '/users', label: 'Users', icon: 'ph:users' },
    { path: '/preference', label: 'Preference', icon: 'ph:sliders' },
    { path: '/docs', label: 'Docs', icon: 'ph:book' },
    { path: '/debug', label: 'Debug', icon: 'ph:bug' }
  ]
};

// 保持原来的 sidebarOpen 逻辑，同时添加菜单结构
const sidebarOpen = ref(false);

// 然后在需要的地方传入 menuGroups
defineExpose({
  menuGroups,
  route
});






</script>

<style scoped>
.ios-pwa-safe-area .bottom-nav {
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom) * 0.5);
}
.ios-header-safe-area {
  padding-top: env(safe-area-inset-top);
}
.header-wrapper {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
}

/* 阻止全局滚动弹性效果 */
/*
:global(html), :global(body) {
  height: 100%;
  overscroll-behavior: contain; 
}
*/

/* 定制化滚动条样式和行为 */
/*
:global(.overscroll-none) {
  overscroll-behavior: none;
}
*/

:global(::-webkit-scrollbar) {
  width: 6px;
}

:global(::-webkit-scrollbar-track) {
  background: transparent;
}

:global(::-webkit-scrollbar-thumb) {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
}

</style>
