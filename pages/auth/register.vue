<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl font-bold text-center">创建账户</CardTitle>
        <CardDescription class="text-center">
          输入您的信息以创建一个新账户。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-2">
            <Label for="username">用户名</Label>
            <Input
              id="username"
              type="text"
              placeholder="Your Name"
              v-model="username"
              required
              :disabled="authStore.isLoading"
            />
          </div>
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
            <span v-if="authStore.isLoading">注册中...</span>
            <span v-else>注册</span>
          </Button>
          <div v-if="authStore.hasError" class="text-sm text-destructive text-center">
            {{ authStore.authError }}
          </div>
          <div v-if="registrationSuccess" class="text-sm text-green-600 text-center">
            注册成功！请前往登录页面。
          </div>
        </form>
      </CardContent>
      <CardFooter class="text-center text-sm">
        已经有账户了？
        <NuxtLink to="/auth/login" class="underline">
          立即登录
        </NuxtLink>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
// import { useRouter } from '#app'; // Correct import for useRouter - Nuxt 3 auto-imports useRouter

const authStore = useAuthStore();
const router = useRouter();
const username = ref('');
const email = ref('');
const password = ref('');
const registrationSuccess = ref(false);

const handleRegister = async () => {
  if (!username.value || !email.value || !password.value) {
    console.error('All fields are required');
    return;
  }
  registrationSuccess.value = false; // Reset success message
  await authStore.register({ name: username.value, email: email.value, password: password.value });
  if (!authStore.hasError && authStore.authStatus === 'success') {
    registrationSuccess.value = true;
    // 注册成功后，可以提示用户或自动跳转到登录页
    // setTimeout(() => router.push('/auth/login'), 2000); // 延迟跳转示例
    console.log('Registration successful, user can now login.');
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