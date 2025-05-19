<template>
  <div class="flex items-center justify-center min-h-screen bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl font-bold text-center">重置密码</CardTitle>
        <CardDescription class="text-center">
          请设置您的新密码
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="tokenError" class="mb-4 p-3 bg-red-100 text-destructive border border-red-300 rounded-md">
          {{ tokenError }}
          <div class="mt-2">
            <NuxtLink to="/auth/forgot-password" class="text-primary hover:underline">
              返回忘记密码页面
            </NuxtLink>
          </div>
        </div>
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <Label for="newPassword">新密码</Label>
            <Input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="请输入新密码"
              required
              :disabled="authStore.isLoading"
            />
            <p v-if="newPassword && !isNewPasswordComplexEnough" class="text-xs text-destructive">
              密码必须至少8个字符，包含大小写字母和数字。
            </p>
          </div>
          <div class="space-y-2">
            <Label for="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              required
              :disabled="authStore.isLoading"
            />
            <p v-if="confirmPassword && newPassword !== confirmPassword" class="text-xs text-destructive">
              两次输入的密码不一致。
            </p>
          </div>
          <Button type="submit" class="w-full" :disabled="authStore.isLoading || !canSubmit">
            <span v-if="authStore.isLoading">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
            <span v-else>重置密码</span>
          </Button>
        </form>
        <div v-if="authStore.authStatus === 'success' && !authStore.authError" class="mt-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">
          密码重置成功！您现在可以使用新密码登录。
          <div class="mt-2">
            <NuxtLink to="/auth/login" class="text-primary hover:underline">
              前往登录页面
            </NuxtLink>
          </div>
        </div>
        <div v-if="authStore.authError" class="mt-4 p-3 bg-red-100 text-destructive border border-red-300 rounded-md">
          {{ authStore.authError }}
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { NuxtLink } from '#components';

const route = useRoute();
const authStore = useAuthStore();
const token = ref<string>(route.params.token as string);
const tokenError = ref<string | null>(null);
const newPassword = ref('');
const confirmPassword = ref('');

// Simple password complexity validation
const isNewPasswordComplexEnough = computed(() => {
  if (!newPassword.value) return true; // If empty, don't show error, let required handle it
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return regex.test(newPassword.value);
});

// Check if form can be submitted
const canSubmit = computed(() => {
  return (
    newPassword.value &&
    confirmPassword.value &&
    newPassword.value === confirmPassword.value &&
    isNewPasswordComplexEnough.value &&
    !authStore.isLoading
  );
});

// Validate token
const validateToken = () => {
  // Simple token validation, check if it exists and has valid format
  // In a real application, you might need to call an API to validate the token
  if (!token.value) {
    tokenError.value = '无效的密码重置链接。请重新申请密码重置。';
    return false;
  }
  
  // More complex token validation logic can be added here
  // For example, checking token format, length, etc.
  
  return true;
};

const handleSubmit = async () => {
  authStore.clearAuthError();
  
  if (!validateToken()) {
    return;
  }
  
  if (!newPassword.value || !confirmPassword.value) {
    authStore.authError = '所有字段均为必填项。';
    authStore.authStatus = 'error';
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    authStore.authError = '两次输入的密码不一致。';
    authStore.authStatus = 'error';
    return;
  }
  
  if (!isNewPasswordComplexEnough.value) {
    authStore.authError = '密码不符合复杂度要求。';
    authStore.authStatus = 'error';
    return;
  }
  
  await authStore.resetPassword(token.value, newPassword.value);
};

onMounted(() => {
  authStore.clearAuthError();
  validateToken();
});

// Clear errors when user starts typing
watch([newPassword, confirmPassword], () => {
  if (authStore.authError) {
    authStore.clearAuthError();
  }
});

// Clear errors when component is unmounted
onUnmounted(() => {
  authStore.clearAuthError();
});
</script>

<style scoped>
/* Add page-specific styles here if needed */
</style>