export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auth check for login page
  if (to.path === '/auth/login') {
    return;
  }

  const authStore = useAuthStore();

  // On client side, check auth if not already logged in
  if (process.client && !authStore.isLoggedIn) {
    console.log('Global auth middleware: Checking auth on client side...');
    const isAuthenticated = await authStore.checkAuth();
    
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }

  // On server side, we rely on the auth plugin to handle initial auth check
  if (process.server && !authStore.isLoggedIn) {
    console.log('Global auth middleware: User not authenticated on server, redirecting to login');
    return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
}); 