# Vercel部署合成问题修复

## 问题描述

在Vercel部署后，播客合成过程出现以下问题：
1. 合成任务正常启动，但状态检查API突然返回404
2. 最终任务超时失败
3. 根本原因：Vercel无服务器函数架构导致内存状态丢失

## 解决方案概述

将任务状态从内存存储改为数据库持久化存储，确保在Vercel的无服务器环境中任务状态不会丢失。

## 主要改动

### 1. 数据库表结构
新增 `synthesis_tasks` 表：
```sql
CREATE TABLE synthesis_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podcast_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress_completed INTEGER NOT NULL DEFAULT 0,
    progress_total INTEGER NOT NULL,
    progress_current_segment INTEGER,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. 任务管理服务
创建 `SynthesisTaskService` 类：
- 使用数据库而不是内存存储任务状态
- 提供任务CRUD操作
- 支持进度更新和结果存储

### 3. API更新
- `/api/podcast/process/synthesize.post.ts`: 使用数据库任务服务
- `/api/podcast/synthesis-status/[taskId].get.ts`: 从数据库读取任务状态
- `/api/podcast/continue-synthesis.post.ts`: 继续合成功能
- `/api/podcast/[id]/details.get.ts`: 获取播客详细信息

### 4. 前端组件修复
- `PodcastCard.vue`: 修复API调用类型错误
- `playground.vue`: 修复import路径和类型定义
- `ContinueSynthesisDialog.vue`: 用户确认对话框

## 部署步骤

### 1. 数据库迁移
```bash
# 如果使用Supabase
npx supabase db push

# 或手动执行SQL
psql -f supabase/migrations/20240524000000_create_synthesis_tasks.sql
```

### 2. 更新环境变量
确保以下环境变量正确配置：
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 部署到Vercel
```bash
# 提交代码
git add .
git commit -m "Fix synthesis task persistence for Vercel deployment"
git push

# Vercel会自动部署
```

## 测试验证

### 1. 本地测试
```bash
# 启动开发服务器
npm run dev

# 运行测试脚本
node test-synthesis-task.js
```

### 2. 生产测试
1. 创建新播客并生成脚本
2. 点击"Continue on Playground"按钮
3. 确认后台合成对话框
4. 验证任务状态能正确跟踪
5. 检查合成完成后的结果

## 技术优势

### 1. 可靠性提升
- 任务状态持久化，不受函数重启影响
- 支持长时间运行的合成任务
- 错误恢复和重试机制

### 2. 扩展性改善
- 支持多实例并发处理
- 可以添加任务优先级和队列管理
- 便于监控和调试

### 3. 用户体验优化
- 实时进度更新
- 任务状态持久化
- 失败任务可以重试

## 监控和维护

### 1. 任务清理
```sql
-- 清理24小时前的旧任务
DELETE FROM synthesis_tasks 
WHERE created_at < NOW() - INTERVAL '24 hours';
```

### 2. 性能监控
- 监控任务完成率
- 跟踪平均处理时间
- 识别常见失败原因

### 3. 日志记录
- 所有任务操作都有详细日志
- 便于排查问题和性能优化

## 注意事项

1. **数据库连接**: 确保Supabase连接稳定
2. **任务超时**: 根据实际需要调整超时设置
3. **并发限制**: 考虑TTS API的并发限制
4. **存储空间**: 定期清理旧任务数据

## 故障排查

### 常见问题
1. **任务创建失败**: 检查数据库连接和权限
2. **状态更新失败**: 验证任务ID正确性
3. **合成超时**: 检查TTS服务配置

### 调试工具
- 查看Supabase日志
- 检查Vercel函数日志
- 使用浏览器开发者工具监控网络请求 