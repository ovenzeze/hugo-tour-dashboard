---
title: 登录/注册功能实现方案
description: 基于项目现有技术栈的完整登录/注册功能实现指南，包含 Reka UI 组件集成
author: System Architect
date: 2025-05-19
tags: ["auth", "login", "register", "password-reset", "reka-ui", "supabase"]
---

# 登录/注册功能实现方案

## 项目技术栈分析

### 现有组件和服务
- **UI组件库**：
  - Reka UI 组件系统
  - Button.vue - 基于 Primitive 的按钮组件
  - Input.vue - 带 v-model 的输入框组件
  - Dialog.vue - 基于 DialogRoot 的对话框组件
  - useFormField.ts - 表单字段验证钩子
- **后端服务**：
  - Supabase Auth（已配置相关环境变量）
- **待实现文件**：
  - Login.vue
  - Register.vue
  - PasswordReset.vue
  - useAuth.ts

## 详细实现方案

### 1. 认证服务实现 (useAuth.ts)

```typescript
import { ref, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export function useAuth() {
  const user = ref<User | null>(null)
  const loading = ref<boolean>(true)
  const error = ref<string | null>(null)

  // 登录方法
  async function login(email: string, password: string) {
    try {
      loading.value = true
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (err) throw err
      user.value = data.user
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // 其他认证方法实现...
  
  return {
    user,
    loading,
    error,
    login
  }
}
```

### 2. 登录页面实现 (Login.vue)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Form, FormField } from '@/components/ui/Form'
import { useAuth } from '@/composables/useAuth'
import { cn } from '@/lib/utils'

const { login, loading, error } = useAuth()
const email = ref('')
const password = ref('')

const onSubmit = async () => {
  await login(email.value, password.value)
}
</script>

<template>
  <div 
    data-slot="login-container"
    :class="cn('w-full max-w-md mx-auto p-6')"
  >
    <h2 class="text-2xl font-bold mb-6">登录</h2>
    
    <Form @submit="onSubmit">
      <FormField name="email">
        <Input 
          data-slot="email-input"
          type="email" 
          placeholder="请输入邮箱"
          v-model="email"
        />
      </FormField>
      
      <FormField name="password">
        <Input 
          data-slot="password-input"
          type="password" 
          placeholder="请输入密码"
          v-model="password"
        />
      </FormField>
      
      <Button 
        data-slot="submit-button"
        type="submit" 
        variant="default" 
        size="lg"
        :disabled="loading"
        class="w-full mt-4"
      >
        {{ loading ? '登录中...' : '登录' }}
      </Button>
    </Form>
    
    <div class="mt-4 flex justify-between text-sm">
      <router-link 
        to="/reset-password"
        class="text-primary hover:underline"
      >
        忘记密码？
      </router-link>
      <router-link 
        to="/register"
        class="text-primary hover:underline"
      >
        没有账号？注册
      </router-link>
    </div>
  </div>
</template>
```

### 3. 注册页面实现 (Register.vue)

与登录页面类似，但需要：
- 增加密码确认字段
- 添加用户协议勾选项
- 实现注册成功后的邮箱验证提示

### 4. 密码重置流程 (PasswordReset.vue)

使用 Dialog 组件实现多步骤流程：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DialogRoot } from 'reka-ui'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const step = ref(1)
const email = ref('')
</script>

<template>
  <DialogRoot>
    <div data-slot="password-reset-flow">
      <!-- 步骤 1: 输入邮箱 -->
      <div v-if="step === 1">
        <h3>重置密码</h3>
        <Input
          v-model="email"
          type="email"
          placeholder="请输入您的邮箱地址"
        />
        <Button @click="requestReset">
          发送重置链接
        </Button>
      </div>
      
      <!-- 其他步骤... -->
    </div>
  </DialogRoot>
</template>
```

## 实施步骤

1. **环境准备**
   - 确认 Supabase 配置
   - 安装必要依赖
   - 配置环境变量

2. **核心服务实现**
   - 完善 useAuth.ts
   - 添加类型定义
   - 实现状态持久化

3. **页面开发**
   - 实现三个主要页面
   - 确保组件复用
   - 保持统一的样式风格

4. **测试与集成**
   - 路由配置
   - 权限控制
   - E2E测试

## 注意事项

1. **组件使用规范**
   - 使用 data-slot 属性标记组件角色
   - 使用 cn() 函数处理样式类名
   - 保持与现有组件一致的 Props 类型定义

2. **样式管理**
   - 遵循项目现有的样式组织方式
   - 使用 Tailwind 类名
   - 保持响应式设计

3. **类型安全**
   - 为所有组件添加适当的类型定义
   - 使用 TypeScript 严格模式
   - 确保类型导入正确

## 后续优化

1. **功能扩展**
   - 添加社交媒体登录选项
   - 实现双因素认证
   - 添加记住登录状态功能

2. **性能优化**
   - 组件按需加载
   - 状态管理优化
   - 表单验证性能优化

