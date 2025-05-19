# 统一 Persona 选择器组件 - 需求分析与设计文档

**1. 引言**

本文档旨在为新的“统一 Persona 选择器组件”提供详细的需求分析和设计规范。该组件旨在升级现有 Playground 中的 Persona 选择功能，并使其能够在项目其他地方复用。

**2. Persona 数据结构**

组件将直接使用从 Supabase 数据库 `personas` 表查询得到的行数据作为其核心数据项。该数据结构（简称为 `PersonaData`）定义如下，其 TypeScript 类型对应为 `Database['public']['Tables']['personas']['Row']`：

```typescript
interface PersonaData {
  persona_id: number;             // 唯一数字ID
  name: string;                   // 名称
  description?: string | null;     // 描述
  avatar_url?: string | null;      // 头像URL
  language_support?: string[] | null; // 支持的语言列表, e.g., ['zh', 'en']
  
  // 以下字段存在于数据库，但组件当前阶段根据简化需求不直接用于核心交互或展示：
  // created_at?: string | null;
  // is_active?: boolean | null;
  // tts_provider?: string | null;
  // updated_at?: string | null;
  // voice_description?: string | null;
  // voice_model_identifier?: string | null;
}
```

**核心使用字段：**

*   `persona_id`: 用于唯一标识和 `v-model` 绑定。
*   `name`: 用于显示 Persona 名称。
*   `avatar_url`: 用于显示 Persona 头像。
*   `description` 或 `voice_description` (如果前者为空): 用于在卡片上提供更详细的文字说明。
*   `language_support`: 用于实现语言筛选功能。

**3. UI/UX 设计建议**

*   **3.1. Persona 展示 (列表)**
    *   **布局**：采用响应式的卡片式布局。
    *   **卡片内容**：
        *   **头像 (`avatar_url`)**: 显著展示，支持默认占位。
        *   **名称 (`name`)**: 清晰展示。
        *   **语言 (`language_support`)**: 以文本或标签形式展示。
        *   **描述 (`description` / `voice_description`)**: 展示几行描述文字。

*   **3.2. 选择交互**
    *   **视觉反馈**：选中的卡片应有明确的视觉高亮（如边框、背景变化或选中图标）。
        *   **单选**：点击新卡片时，旧卡片取消高亮。
        *   **多选**：支持点击切换选中/未选中状态，可考虑使用复选框视觉元素。
    *   **操作**：通过点击 Persona 卡片进行选择。

*   **3.3. 语言筛选**
    *   **形式**：下拉菜单或标签/按钮组。包含“全部语言”选项。
    *   **数据来源**：优先使用 `availableLanguages` prop；若未提供，则从 `personas` 数据中自动提取。
    *   **联动**：选择语言后，列表动态过滤。

*   **3.4. 多选上限 (`maxSelection`)**
    *   若设置，则在达到上限时阻止进一步选择，并给出提示。

**4. 组件接口定义 (Props & Events)**

*   **4.1. Props (输入属性)**
    *   `personas: PersonaData[]` (必需): Persona 数据源。TypeScript 类型为 `Database['public']['Tables']['personas']['Row'][]`。
    *   `selectionMode: 'single' | 'multiple'` (可选, 默认: `'single'`): 选择模式。
    *   `value: number | number[] | null` (或 `v-model`) (可选): 双向绑定的选中 Persona ID(s)。单选时为 `number | null`，多选时为 `number[]`。
    *   `maxSelection?: number` (可选): 多选模式下的最大可选数。
    *   `availableLanguages?: string[]` (可选): 用于构建语言筛选器的语言列表。

*   **4.2. Events (输出事件)**
    *   `'update:value': (selectedValue: number | number[] | null) => void`: 选择变化时触发，用于 `v-model`。
        *   单选时：`number | null` (选中的 `persona_id` 或 `null`)。
        *   多选时：`number[]` (选中的 `persona_id` 数组)。
    *   `change?: (selectedValue: number | number[] | null, selectedPersonas: PersonaData | PersonaData[] | null) => void` (可选): 选择变化时触发，提供 ID 和完整对象。
        *   `PersonaData` 对应 `Database['public']['Tables']['personas']['Row']`。