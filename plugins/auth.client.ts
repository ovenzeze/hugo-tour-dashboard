export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore();
  
  // Check authentication status on app initialization
  if (process.client) {
    console.log('Initializing auth check on client...');
    await authStore.checkAuth();
  }
}); 