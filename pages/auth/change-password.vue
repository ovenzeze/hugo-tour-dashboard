 ze<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl font-bold text-center">修改密码</CardTitle>
        <CardDescription class="text-center">
          请输入您的旧密码和新密码。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div>
            <Label for="oldPassword">旧密码</Label>
            <Input
              id="oldPassword"
              v-model="oldPassword"
              type="password"
              placeholder="请输入旧密码"
              required
            />
          </div>
          <div>
            <Label for="newPassword">新密码</Label>
            <Input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="请输入新密码"
              required
            />
            <!-- 可选：密码复杂度提示 -->
            <p v-if="newPassword && !isNewPasswordComplexEnough" class="text-xs text-destructive mt-1">
              新密码长度至少8位，包含大小写字母和数字。
            </p>
          </div>
          <div>
            <Label for="confirmNewPassword">确认新密码</Label>
            <Input
              id="confirmNewPassword"
              v-model="confirmNewPassword"
              type="password"
              placeholder="请再次输入新密码"
              required
            />
            <p v-if="newPassword && confirmNewPassword && newPassword !== confirmNewPassword" class="text-xs text-destructive mt-1">
              两次输入的新密码不一致。
            </p>
          </div>

          <Button type="submit" class="w-full" :disabled="authStore.isLoading">
            <Loader2 v-if="authStore.isLoading" class="w-4 h-4 mr-2 animate-spin" />
            提交更改
          </Button>

          <div v-if="authStore.authStatus === 'error' && authStore.authError" class="mt-4 text-center text-sm text-destructive">
            <p>{{ authStore.authError }}</p>
          </div>
          <div v-if="authStore.authStatus === 'success' && successMessage" class="mt-4 text-center text-sm text-green-600">
            <p>{{ successMessage }}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-vue-next';

definePageMeta({
  middleware: ['auth'] // 应用 auth 中间件
});

const authStore = useAuthStore();
const router = useRouter();

const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const successMessage = ref<string | null>(null);

// 简单的密码复杂度校验示例
const isNewPasswordComplexEnough = computed(() => {
  if (!newPassword.value) return true; // 如果为空，则不显示错误，由 required 处理
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return regex.test(newPassword.value);
});

const canSubmit = computed(() => {
  return (
    oldPassword.value &&
    newPassword.value &&
    confirmNewPassword.value &&
    newPassword.value === confirmNewPassword.value &&
    isNewPasswordComplexEnough.value && // 确保密码复杂度也满足
    !authStore.isLoading
  );
});

const handleChangePassword = async () => {
  successMessage.value = null;
  authStore.clearAuthError();

  if (!oldPassword.value || !newPassword.value || !confirmNewPassword.value) {
    authStore.authError = '所有字段均为必填项。';
    authStore.authStatus = 'error';
    return;
  }

  if (newPassword.value !== confirmNewPassword.value) {
    authStore.authError = '两次输入的新密码不一致。';
    authStore.authStatus = 'error';
    return;
  }

  if (!isNewPasswordComplexEnough.value) {
    authStore.authError = '新密码不符合复杂度要求。';
    authStore.authStatus = 'error';
    return;
  }

  await authStore.changePassword({
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
  });

  if (authStore.authStatus === 'success') {
    successMessage.value = '密码修改成功！';
    // 可选：一段时间后清除成功消息或跳转
    setTimeout(() => {
      successMessage.value = null;
      // router.push('/profile'); // 例如跳转到个人资料页
    }, 3000);
    oldPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
  }
};

onMounted(() => {
  // 页面加载时清除可能存在的旧错误信息
  authStore.clearAuthError();
});
</script>

<style scoped>
/* 可以在这里添加特定于此页面的样式 */
</style>