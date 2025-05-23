import { defineStore } from 'pinia';

interface User {
  id: string;
  name: string;
  email: string;
  // 根据实际需要添加更多用户属性
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  authStatus: 'idle' | 'loading' | 'success' | 'error';
  authError: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    isLoggedIn: false,
    authStatus: 'idle',
    authError: null,
  }),
  getters: {
    isAuthenticated(state): boolean {
      return state.isLoggedIn;
    },
    currentUser(state): User | null {
      return state.user;
    },
    authToken(state): string | null {
      return state.token;
    },
    isLoading(state): boolean {
      return state.authStatus === 'loading';
    },
    hasError(state): boolean {
      return state.authStatus === 'error' && state.authError !== null;
    },
  },
  actions: {
    async login(credentials: { email: string; password: string }) {
      this.authStatus = 'loading';
      this.authError = null;
      try {
        // Call real login API
        const response = await $fetch('/api/auth/login', {
          method: 'POST',
          body: {
            email: credentials.email,
            password: credentials.password
          }
        });

        if (response.success) {
          this.user = response.user;
          this.token = response.token;
          this.isLoggedIn = true;
          this.authStatus = 'success';
          
          // Store token in localStorage for persistence
          if (process.client) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('authUser', JSON.stringify(response.user));
          }
          
          console.log('Login successful', this.user);
          
          // Redirect to intended page or home
          const router = useRouter();
          const route = useRoute();
          const redirectTo = route.query.redirect as string || '/';
          await router.push(redirectTo);
        }
      } catch (error: any) {
        this.authStatus = 'error';
        this.authError = error.data?.statusMessage || error.message || 'Login failed';
        this.isLoggedIn = false;
        console.error('Login error', this.authError);
      }
    },
    
    async logout() {
      try {
        // Call logout API to clear server-side cookie
        await $fetch('/api/auth/logout', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Logout API error:', error);
        // Continue with client-side logout even if API fails
      }
      
      // Clear client-side state
      this.user = null;
      this.token = null;
      this.isLoggedIn = false;
      this.authStatus = 'idle';
      this.authError = null;
      
      // Clear localStorage
      if (process.client) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
      
      console.log('User logged out');
      
      // Redirect to login page
      const router = useRouter();
      await router.push('/auth/login');
    },
    
    async checkAuth() {
      console.log('Checking auth status...');
      
      try {
        // First try to get token from localStorage
        let token = null;
        let user = null;
        
        if (process.client) {
          token = localStorage.getItem('authToken');
          const userStr = localStorage.getItem('authUser');
          if (userStr) {
            try {
              user = JSON.parse(userStr);
            } catch (e) {
              console.error('Error parsing stored user:', e);
            }
          }
        }
        
        if (token) {
          // Verify token with server
          const response = await $fetch('/api/auth/verify', {
            method: 'POST',
            body: { token }
          });
          
          if (response.success && response.valid) {
            this.user = response.user;
            this.token = token;
            this.isLoggedIn = true;
            this.authStatus = 'success';
            console.log('Auth status restored from storage and verified');
            return true;
          }
        }
        
        // If no token or verification failed, clear everything
        this.logout();
        return false;
        
      } catch (error: any) {
        console.error('Auth check failed:', error);
        this.logout();
        return false;
      }
    },
    
    clearAuthError() {
      this.authError = null;
      this.authStatus = 'idle';
    },

    // Remove unused methods that were for demo purposes
    async register(userData: { name: string; email: string; password: string }) {
      // Registration disabled for simple auth
      this.authStatus = 'error';
      this.authError = 'Registration is not available';
    },
    
    async changePassword(passwords: { oldPassword: string; newPassword: string }) {
      // Password change disabled for simple auth
      this.authStatus = 'error';
      this.authError = 'Password change is not available';
    },
    
    async requestPasswordReset(email: string) {
      // Password reset disabled for simple auth
      this.authStatus = 'error';
      this.authError = 'Password reset is not available';
    }
  },
});