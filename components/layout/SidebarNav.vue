<template>
  <Sidebar class="flex h-full max-h-screen flex-col">
    <div class="flex h-14 items-center  px-4 lg:h-[60px] lg:px-6">
      <NuxtLink to="/" class="flex items-center gap-3 font-semibold">
        <Icon name="ph:compass-tool" class="h-5 w-5 text-primary" />
        <span>Hugo Dashboard</span>
      </NuxtLink>
      <!-- 如果有其他头部元素，例如通知按钮，可以放在这里 -->
    </div>
    <SidebarContent class="flex-1 overflow-y-auto  px-4">
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem
            v-for="link in navLinks"
            :key="link.path"
            class="gap-y-4"
          >
            <SidebarMenuButton
              as-child
              :class="{ 'bg-muted': $route.path.startsWith(link.path) }"
              @click="$emit('close')"
            >
              <NuxtLink :to="link.path" class="flex items-center">
                <Icon :name="link.icon" class="mr-2 h-5 w-5 shrink-0" />
                <span class="truncate text-sm font-medium">{{ link.label }}</span>
              </NuxtLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <!-- 可选的页脚部分，例如账户切换器 -->
    <!--
    <div class="mt-auto p-4 border-t">
      <Button size="sm" class="w-full">
        Sign Out
      </Button>
    </div>
    -->
  </Sidebar>
</template>

<script setup lang="ts">
import { Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { defineEmits, defineProps } from 'vue';
// Use Nuxt's Icon component instead of Iconify
// import { Icon } from '@iconify/vue';
// NuxtLink 通常是自动导入的，如果遇到问题，可以从 '#components' 或 'nuxt/link' 导入
// import { NuxtLink } from '#components';

export interface NavLink {
  path: string;
  label: string;
  icon: string;
}

defineProps<{
  navLinks: NavLink[];
}>();

defineEmits(['close']);
</script>

<style scoped>
/* 根据需要添加自定义样式，通常shadcn/ui的组件和工具类已经足够 */
.overflow-y-auto {
  scrollbar-width: thin; /* For Firefox */
  scrollbar-color: hsl(var(--border)) hsl(var(--background)); /* For Firefox */
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: hsl(var(--background));
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 3px;
  border: 1px solid hsl(var(--background));
}
</style>
