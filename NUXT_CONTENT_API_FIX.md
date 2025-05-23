# Nuxt Content API 修复总结

## 🐛 问题描述

在docs页面出现了 `queryContent is not defined` 错误，这是因为项目使用了Nuxt Content v3，但代码中使用的是旧版本的API调用方式。

## 🔍 根本原因

Nuxt Content v3 对API进行了重大更新：

1. **必须使用 `useAsyncData` 包装**: 所有 `queryContent()` 调用都必须包装在 `useAsyncData` 中
2. **路径查询方式变更**: 不能直接传递特定路径，需要使用 `where()` 条件查询
3. **集合支持**: 新增了 `queryCollection()` API用于集合查询

## 🛠️ 修复内容

### 1. 修复 `pages/docs/index.vue`

**之前**：
```javascript
const { data: allDocs, pending, error } = await useAsyncData('docs-all', () =>
  queryContent('docs')
    .find()
)
```

**修复后**：
```javascript
const { data: allDocs, pending, error } = await useAsyncData('docs-all', () =>
  queryContent('/')
    .find()
)
```

### 2. 修复 `pages/docs/[...slug].vue`

**sidebar查询修复**：
```javascript
// 修复前
const { data: allDocs } = await useAsyncData('docs-sidebar', () =>
  queryContent('docs')
    .only(['_path', 'title', 'description'])
    .find()
)

// 修复后  
const { data: allDocs } = await useAsyncData('docs-sidebar', () =>
  queryContent('/')
    .only(['_path', 'title', 'description'])
    .find()
)
```

**文档内容查询修复**：
```javascript
// 修复前
const result = await queryContent(path).findOne()

// 修复后
const result = await queryContent('/').where({ _path: path }).findOne()
```

### 3. 保持content.config.ts配置

项目中的 `content.config.ts` 配置保持不变：
```typescript
import { defineCollection, defineContentConfig } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: 'content/docs/**'
    })
  }
})
```

## 📋 新API使用模式

### 基本查询模式
```javascript
// ✅ 正确的Nuxt Content v3用法
const { data: docs } = await useAsyncData('docs-key', () =>
  queryContent('/')
    .find()
)
```

### 条件查询模式  
```javascript
// ✅ 按路径查询
const { data: doc } = await useAsyncData('doc-key', () =>
  queryContent('/')
    .where({ _path: '/docs/example' })
    .findOne()
)

// ✅ 按其他条件查询
const { data: docs } = await useAsyncData('filtered-docs', () =>
  queryContent('/')
    .where({ published: true })
    .find()
)
```

### 集合查询模式（可选）
```javascript
// ✅ 使用集合查询（如果已定义集合）
const { data: docs } = await useAsyncData('docs-collection', () =>
  queryCollection('docs')
    .all()
)
```

## 🔄 迁移清单

- [x] 更新 `pages/docs/index.vue` 中的查询
- [x] 更新 `pages/docs/[...slug].vue` 中的查询
- [x] 确保所有 `queryContent` 调用都使用 `useAsyncData` 包装
- [x] 验证路径查询使用 `where()` 条件
- [x] 测试docs页面功能正常

## 📚 参考文档

- [Nuxt Content v3 queryContent API](https://content.nuxt.com/composables/query-content)
- [Nuxt Content v3 Collections API](https://content.nuxt.com/docs/utils/query-collection)
- [Migration Guide](https://content.nuxt.com/get-started/migration)

## ⚠️ 注意事项

1. **必须使用 useAsyncData**: 所有内容查询都必须包装在 `useAsyncData` 中
2. **路径查询变更**: 直接传递路径给 `queryContent()` 的方式已废弃
3. **错误处理**: 新API的错误处理方式略有不同，需要注意异常捕获
4. **性能优化**: 新API提供了更好的缓存和性能优化机制

## 🎯 后续建议

1. **考虑使用集合**: 如果文档结构复杂，可以考虑使用 `queryCollection` API
2. **优化查询**: 使用 `only()` 和 `without()` 来选择需要的字段，提升性能
3. **缓存策略**: 合理设置 `useAsyncData` 的缓存键，避免重复查询
4. **类型安全**: 结合TypeScript使用，获得更好的类型提示 