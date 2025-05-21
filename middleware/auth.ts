import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();

  // 在客户端，Pinia store 可能尚未完全水合（hydrated）
  // 尤其是在直接访问受保护页面或刷新页面时。
  // 我们需要确保 authStore 的状态是最新的。
  // checkAuth 通常会从 localStorage 或类似地方恢复状态。
  if (process.client && !authStore.isLoggedIn) {
    authStore.checkAuth(); // 尝试恢复认证状态
  }

  // 再次检查 isLoggedIn 状态
  if (!authStore.isLoggedIn) {
    // 用户未登录，重定向到登录页
    // 保留用户尝试访问的原始路径，以便登录后可以重定向回来
    if (to.path !== '/auth/login') {
      return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }
  // 如果用户已登录，或者目标路径已经是登录页，则允许导航
});