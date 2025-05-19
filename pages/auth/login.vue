<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl font-bold text-center">登录</CardTitle>
        <CardDescription class="text-center">
          输入您的邮箱和密码以访问您的账户。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <Label for="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              v-model="email"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <div class="space-y-2">
            <Label for="password">密码</Label>
            <Input
              id="password"
              type="password"
              v-model="password"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="authStore.isLoading">
            <span v-if="authStore.isLoading">登录中...</span>
            <span v-else>登录</span>
          </Button>
          <div v-if="authStore.hasError" class="text-sm text-destructive text-center">
            {{ authStore.authError }}
          </div>
        </form>
      </CardContent>
      <CardFooter class="text-center text-sm">
        还没有账户？
        <NuxtLink to="/auth/register" class="underline">
          立即注册
        </NuxtLink>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const authStore = useAuthStore();
const email = ref('');
const password = ref('');

const handleLogin = async () => {
  if (!email.value || !password.value) {
    // 可以添加更友好的提示
    console.error('Email and password are required');
    return;
  }
  await authStore.login({ email: email.value, password: password.value });
  if (authStore.isAuthenticated) {
    // 登录成功后的跳转逻辑，例如跳转到仪表盘
    // useRouter().push('/dashboard');
    console.log('Login successful, redirecting...');
  }
};

// 清除之前的错误信息
onMounted(() => {
  authStore.clearAuthError();
});
</script>

<style scoped>
/* 可以在这里添加特定于此页面的样式 */
</style>