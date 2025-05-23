<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription class="text-center">
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@hugoapp.com"
              v-model="email"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              v-model="password"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="authStore.isLoading">
            <span v-if="authStore.isLoading">Logging in...</span>
            <span v-else>Login</span>
          </Button>
          <div v-if="authStore.hasError" class="text-sm text-destructive text-center">
            {{ authStore.authError }}
          </div>
        </form>
      </CardContent>
      <CardFooter class="text-center text-sm text-muted-foreground">
        Simple password-based authentication system
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
};

// 清除之前的错误信息
onMounted(() => {
  authStore.clearAuthError();
});
</script>

<style scoped>
/* 可以在这里添加特定于此页面的样式 */
</style>