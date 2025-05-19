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
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUser: User = { id: '1', name: 'Test User', email: credentials.email };
        const mockToken = 'mock-jwt-token';

        this.user = mockUser;
        this.token = mockToken;
        this.isLoggedIn = true;
        this.authStatus = 'success';
        console.log('Login successful', this.user, this.token);
      } catch (error: any) {
        this.authStatus = 'error';
        this.authError = error.message || 'Login failed';
        this.isLoggedIn = false;
        console.error('Login error', this.authError);
      }
    },
    async register(userData: { name: string; email: string; password: string }) {
      this.authStatus = 'loading';
      this.authError = null;
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUser: User = { id: '2', name: userData.name, email: userData.email };
        // 通常注册后不会立即返回 token，或者后端会决定是否直接登录
        // 这里我们模拟注册成功，但不自动登录
        this.authStatus = 'success';
        console.log('Registration successful for user:', mockUser);
        // 可以在这里决定是否自动登录或提示用户去登录
        // 例如: this.login({ email: userData.email, password: userData.password });
      } catch (error: any) {
        this.authStatus = 'error';
        this.authError = error.message || 'Registration failed';
        console.error('Registration error', this.authError);
      }
    },
    logout() {
      // 模拟 API 调用（如果需要）
      this.user = null;
      this.token = null;
      this.isLoggedIn = false;
      this.authStatus = 'idle';
      this.authError = null;
      console.log('User logged out');
    },
    checkAuth() {
      // 模拟检查本地存储的 token
      // 在实际应用中，这里会从 localStorage 或 cookie 读取 token
      // 并可能需要调用 API 验证 token 有效性
      console.log('Checking auth status...');
      const storedToken = localStorage.getItem('authToken'); // 示例：从 localStorage 读取
      if (storedToken) {
        // 假设 token 有效，并能从中解析出用户信息或重新获取用户信息
        // 这里简化处理
        const storedUser = JSON.parse(localStorage.getItem('authUser') || '{}') as User;
        if (storedUser && storedUser.id) {
            this.user = storedUser;
            this.token = storedToken;
            this.isLoggedIn = true;
            this.authStatus = 'success';
            console.log('Auth status restored from storage');
        } else {
            this.logout(); // 如果用户信息不完整或无效
        }
      } else {
        this.isLoggedIn = false;
        console.log('No stored token found.');
      }
    },
    clearAuthError() {
      this.authError = null;
      this.authStatus = 'idle';
    },
    async changePassword(passwords: { oldPassword: string; newPassword: string }) {
      this.authStatus = 'loading';
      this.authError = null;
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 假设 API 调用成功
        // 在实际应用中，后端会验证旧密码并更新密码
        console.log('Password change requested for user:', this.user?.email);
        console.log('Old password (simulated):', passwords.oldPassword);
        console.log('New password (simulated):', passwords.newPassword);

        // 模拟成功：通常不需要更新本地用户状态，除非API返回了更新后的用户信息
        // 如果密码修改成功，可能需要提示用户重新登录，或根据应用策略处理
        this.authStatus = 'success';
        // 可以选择清除 token 并强制用户重新登录
        // this.logout();
        // alert('密码修改成功，请重新登录。');
        console.log('Password changed successfully.');
      } catch (error: any) {
        this.authStatus = 'error';
        this.authError = error.message || 'Password change failed';
        console.error('Password change error', this.authError);
      }
    },
    async requestPasswordReset(email: string) {
      this.authStatus = 'loading';
      this.authError = null;
      try {
        // 模拟 API 调用
        console.log(`请求密码重置，邮箱: ${email}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 模拟成功
        this.authStatus = 'success';
        // 出于安全考虑，通常不会确认邮箱是否存在
        // 而是显示一个通用的成功消息
        console.log('密码重置邮件已发送（模拟）');
      } catch (error: any) {
        this.authStatus = 'error';
        this.authError = error.message || '密码重置请求失败';
        console.error('密码重置请求错误:', error);
      }
    },
    
    async resetPassword(token: string, newPassword: string) {
      this.authStatus = 'loading';
      this.authError = null;
      try {
        // 模拟 API 调用
        console.log(`重置密码，令牌: ${token}，新密码: ${newPassword}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 模拟成功
        this.authStatus = 'success';
        console.log('密码重置成功（模拟）');
        
        // 在实际应用中，这里会调用 Supabase API 重置密码
        // 例如：
        // const { error } = await supabase.auth.updateUser({ password: newPassword });
        // if (error) throw error;
      } catch (error: any) {
        this.authStatus = 'error';
        this.authError = error.message || '密码重置失败';
        console.error('密码重置错误:', error);
      }
    },
  },
  // Nuxt 3 中 Pinia 状态持久化通常通过插件完成
  // 例如 pinia-plugin-persistedstate
  // persist: true, // 如果使用 pinia-plugin-persistedstate
});