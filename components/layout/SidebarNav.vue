<template>
  <Sidebar class="flex h-full max-h-screen flex-col" :collapsible="props.collapsible">
    <!-- 头部区域 -->
    <SidebarHeader>
      <NuxtLink to="/" class="flex items-center gap-2 overflow-hidden min-w-0">
        <Icon name="ph:compass-tool" class="h-5 w-5 text-primary" />
        <span class="font-semibold">Hugo Dashboard</span>
      </NuxtLink>
      
      <!-- 可选的搜索框 -->
      <div class="mt-2">
        <SidebarInput placeholder="Search..." />
      </div>
    </SidebarHeader>
    
    <!-- 主内容区域 -->
    <SidebarContent>
      <!-- 第一组：概览 -->
      <SidebarGroup>
        <SidebarGroupLabel>Overview</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="link in menuGroups.overview" :key="link.path">
              <SidebarMenuButton
                as-child
                :isActive="$route.path.startsWith(link.path)"
                @click="$emit('close')"
                :tooltip="link.label"
              >
                <NuxtLink :to="link.path" class="flex items-center overflow-hidden min-w-0">
                  <Icon :name="link.icon" class="mr-2 h-5 w-5 shrink-0" />
                  <span class="truncate text-sm font-medium">{{ link.label }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarSeparator />
      
      <!-- 第二组：内容管理 -->
      <SidebarGroup>
        <SidebarGroupLabel>Content</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="link in menuGroups.content" :key="link.path">
              <SidebarMenuButton
                as-child
                :isActive="$route.path.startsWith(link.path)"
                @click="$emit('close')"
                :tooltip="link.label"
              >
                <NuxtLink :to="link.path" class="flex items-center overflow-hidden min-w-0">
                  <Icon :name="link.icon" class="mr-2 h-5 w-5 shrink-0" />
                  <span class="truncate text-sm font-medium">{{ link.label }}</span>
                  
                  <!-- 如果需要，可以添加徽章 -->
                  <template v-if="link.badge">
                    <SidebarMenuBadge class="ml-auto">{{ link.badge }}</SidebarMenuBadge>
                  </template>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarSeparator />
      
      <!-- 资源管理 -->
      <SidebarGroup v-if="menuGroups.resources && menuGroups.resources.length > 0">
        <SidebarGroupLabel>Resources</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="link in menuGroups.resources" :key="link.path">
              <SidebarMenuButton
                as-child
                :isActive="$route.path.startsWith(link.path)"
                @click="$emit('close')"
                :tooltip="link.label"
              >
                <NuxtLink :to="link.path" class="flex items-center overflow-hidden min-w-0">
                  <Icon :name="link.icon" class="mr-2 h-5 w-5 shrink-0" />
                  <span class="truncate text-sm font-medium">{{ link.label }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarSeparator v-if="menuGroups.resources && menuGroups.resources.length > 0" />
      
      <!-- 客户端页面 -->
      <SidebarGroup v-if="menuGroups.client && menuGroups.client.length > 0">
        <SidebarGroupLabel>Client</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="link in menuGroups.client" :key="link.path">
              <SidebarMenuButton
                as-child
                :isActive="$route.path.startsWith(link.path)"
                @click="$emit('close')"
                :tooltip="link.label"
              >
                <NuxtLink :to="link.path" class="flex items-center overflow-hidden min-w-0">
                  <Icon :name="link.icon" class="mr-2 h-5 w-5 shrink-0" />
                  <span class="truncate text-sm font-medium">{{ link.label }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarSeparator v-if="menuGroups.client && menuGroups.client.length > 0" />
      
      <!-- 第三组：系统管理 -->
      <SidebarGroup>
        <SidebarGroupLabel>Administration</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="link in menuGroups.admin" :key="link.path">
              <SidebarMenuButton
                as-child
                :isActive="$route.path.startsWith(link.path)"
                @click="$emit('close')"
                :tooltip="link.label"
              >
                <NuxtLink :to="link.path" class="flex items-center overflow-hidden min-w-0">
                  <Icon :name="link.icon" class="mr-2 h-5 w-5 shrink-0" />
                  <span class="truncate text-sm font-medium">{{ link.label }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    
    <!-- 底部区域：用户信息和退出 -->
    <SidebarFooter>
      <SidebarSeparator />

      <!-- 用户信息或登录/注册按钮 -->
      <div class="p-2">
        <template v-if="authStore.isLoggedIn && authStore.currentUser">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 overflow-hidden min-w-0">
              <Avatar class="h-8 w-8">
                <!-- <AvatarImage :src="authStore.currentUser.avatarUrl" v-if="authStore.currentUser.avatarUrl" /> -->
                <AvatarFallback>
                  <Icon name="ph:user-circle" class="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div class="flex flex-col overflow-hidden min-w-0">
                <p class="text-sm font-medium line-clamp-1">{{ authStore.currentUser.name }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ authStore.currentUser.email }}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Icon name="ph:dots-three-vertical" class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="navigateTo('/profile')">Profile</DropdownMenuItem>
                <DropdownMenuItem @click="navigateTo('/settings')">Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleLogout" class="text-destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/auth/login" @click="$emit('close')">
            <Button variant="outline" class="w-full">
              <Icon name="ph:sign-in" class="mr-2 h-5 w-5" />
              Login / Register
            </Button>
          </NuxtLink>
        </template>
      </div>
    </SidebarFooter>
  </Sidebar>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/'); // 或登录页 '/auth/login'
  emit('close');
};

const navigateTo = (path: string) => {
  router.push(path);
  emit('close');
};

interface NavLink {
  path: string;
  label: string;
  icon: string;
  badge?: string | number;
}

interface MenuGroups {
  overview: NavLink[];
  content: NavLink[];
  resources?: NavLink[];
  client?: NavLink[];
  admin: NavLink[];
}

const props = defineProps<{
  menuGroups: MenuGroups;
  collapsible?: 'icon' | 'offcanvas' | 'none';
}>();

const emit = defineEmits(['close']);
</script>

<style scoped>
/* 确保 Sidebar 只能垂直滚动，禁止水平滚动 */
.flex.h-full.max-h-screen.flex-col {
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 如果 SidebarContent 是实际的滚动容器，也可以针对它设置 */
:deep(.sidebar-content) { /* 假设 SidebarContent 内部有一个类名为 sidebar-content 的元素 */
  overflow-y: auto;
  overflow-x: hidden;
}

/* 或者直接针对 Sidebar 组件的滚动区域，这取决于 Sidebar 内部结构 */
/* 您可能需要检查 Sidebar 组件的实现来确定正确的选择器 */
</style>
