<template>
  <div class="flex items-center justify-center min-h-screen bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl font-bold text-center">忘记密码</CardTitle>
        <CardDescription class="text-center">
          请输入您的邮箱地址，我们将向您发送密码重置链接。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <Label for="email">邮箱地址</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              :disabled="authStore.isLoading"
            />
            <p v-if="emailError" class="text-sm text-destructive">{{ emailError }}</p>
          </div>
          <Button type="submit" class="w-full" :disabled="authStore.isLoading">
            <span v-if="authStore.isLoading">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              发送中...
            </span>
            <span v-else>发送重置链接</span>
          </Button>
        </form>
        <div v-if="authStore.authStatus === 'success' && !authStore.authError" class="mt-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">
          如果您的邮箱地址存在于我们的系统中，密码重置链接已发送至您的邮箱。请检查您的收件箱（包括垃圾邮件文件夹）。
        </div>
        <div v-if="authStore.authError" class="mt-4 p-3 bg-red-100 text-destructive border border-red-300 rounded-md">
          {{ authStore.authError }}
        </div>
      </CardContent>
      <CardFooter class="text-center">
        <NuxtLink to="/auth/login" class="text-sm text-muted-foreground hover:text-primary">
          返回登录页面
        </NuxtLink>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { NuxtLink } from '#components';

const authStore = useAuthStore();
const email = ref('');
const emailError = ref<string | null>(null);

const validateEmail = (emailValue: string): boolean => {
  if (!emailValue) {
    emailError.value = '邮箱地址不能为空。';
    return false;
  }
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailValue)) {
    emailError.value = '请输入有效的邮箱地址。';
    return false;
  }
  emailError.value = null;
  return true;
};

const handleSubmit = async () => {
  authStore.clearAuthError(); // Clear previous errors
  if (!validateEmail(email.value)) {
    return;
  }
  await authStore.requestPasswordReset(email.value);
  // Message display is handled by watching authStore.authStatus and authStore.authError
};

// Clear error when email changes
watch(email, () => {
  if (emailError.value) {
    emailError.value = null;
  }
  // If user starts typing again after a failed attempt, clear the store error
  if (authStore.authError) {
    authStore.clearAuthError();
  }
});

// Clear store error when component is unmounted
onUnmounted(() => {
  authStore.clearAuthError();
});
</script>

<style scoped>
/* Add any page-specific styles here */
</style>