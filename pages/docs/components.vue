<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-8">组件文档</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- 侧边导航 -->
      <div class="md:col-span-1">
        <div class="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sticky top-20">
          <h2 class="text-lg font-semibold mb-4">组件列表</h2>
          <ul class="space-y-2">
            <li>
              <a 
                href="#persona-selector" 
                class="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                :class="{ 'bg-gray-100 dark:bg-zinc-800 font-medium': activeSection === 'persona-selector' }"
                @click.prevent="scrollToSection('persona-selector')"
              >
                PersonaSelector
              </a>
            </li>
            <!-- 未来可以添加更多组件 -->
          </ul>
        </div>
      </div>
      
      <!-- 主要内容 -->
      <div class="md:col-span-3">
        <!-- PersonaSelector 组件文档 -->
        <section id="persona-selector" class="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 mb-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold">PersonaSelector</h2>
            <Badge variant="outline" class="text-xs">UI 组件</Badge>
          </div>
          
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            PersonaSelector 是一个支持多选和单选的可搜索高级选择器组件，用于选择角色（Persona）。
            它基于 shadcn/ui 的 Combobox 组件构建，提供了丰富的功能和良好的用户体验。
          </p>
          
          <!-- 功能特点 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3">功能特点</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>支持单选和多选模式</li>
              <li>支持搜索过滤</li>
              <li>显示选中项目的标签</li>
              <li>支持禁用状态</li>
              <li>支持自定义标签和描述</li>
            </ul>
          </div>
          
          <!-- 示例 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3">示例</h3>
            
            <Tabs default-value="preview" class="mb-6">
              <TabsList>
                <TabsTrigger value="preview">预览</TabsTrigger>
                <TabsTrigger value="code">代码</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" class="p-4 border rounded-md mt-2">
                <PersonaSelectorExample />
              </TabsContent>
              <TabsContent value="code" class="mt-2">
                <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code>&lt;template&gt;
  &lt;div class="space-y-8"&gt;
    &lt;div&gt;
      &lt;h2 class="text-lg font-medium mb-4"&gt;单选模式&lt;/h2&gt;
      &lt;PersonaSelector
        v-model="selectedPersona"
        :personas="personas"
        label="选择一个角色"
        placeholder="搜索角色..."
        description="请选择一个角色作为主持人"
        :filterable="true"
      /&gt;
    &lt;/div&gt;

    &lt;div&gt;
      &lt;h2 class="text-lg font-medium mb-4"&gt;多选模式&lt;/h2&gt;
      &lt;PersonaSelector
        v-model="selectedPersonas"
        :personas="personas"
        :multiple="true"
        label="选择多个角色"
        placeholder="搜索角色..."
        description="请选择多个角色作为嘉宾"
        :filterable="true"
      /&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref } from 'vue';
import type { ApiPersona } from '~/pages/personas/index.vue';

// 单选模式
const selectedPersona = ref&lt;number | null&gt;(null);

// 多选模式
const selectedPersonas = ref&lt;number[]&gt;([]);

// 角色数据
const personas = ref&lt;ApiPersona[]&gt;([
  {
    persona_id: 1,
    name: '历史学家',
    description: '专注于历史事件和文化背景的解说',
    // 其他属性...
  },
  // 其他角色...
]);
&lt;/script&gt;</code></pre>
              </TabsContent>
            </Tabs>
          </div>
          
          <!-- API 文档 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3">API</h3>
            
            <h4 class="font-medium mb-2">Props</h4>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">属性名</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">类型</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">默认值</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">modelValue</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">number | number[] | null</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">null</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">选中的角色ID或ID数组</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">personas</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">ApiPersona[]</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">[]</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">角色数据列表</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">multiple</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">是否支持多选</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">filterable</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">是否支持搜索过滤</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">disabled</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">是否禁用</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">label</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">标签文本</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">placeholder</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">输入框占位文本</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">description</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">描述文本</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h4 class="font-medium mt-4 mb-2">事件</h4>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">事件名</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">参数</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">update:modelValue</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">number | number[] | null</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">当选中值变化时触发</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 最佳实践 -->
          <div>
            <h3 class="text-lg font-semibold mb-3">最佳实践</h3>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <strong>单选模式</strong>：当只需要选择一个角色时使用，例如选择主持人或主讲人。
              </li>
              <li>
                <strong>多选模式</strong>：当需要选择多个角色时使用，例如选择嘉宾或参与者。
              </li>
              <li>
                <strong>搜索功能</strong>：当角色列表较长时，建议启用搜索功能（filterable=true），提高用户体验。
              </li>
              <li>
                <strong>描述文本</strong>：提供清晰的描述文本，帮助用户理解选择的目的和要求。
              </li>
            </ul>
          </div>
        </section>
        
        <!-- 未来可以添加更多组件文档 -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import PersonaSelectorExample from '~/components/PersonaSelectorExample.vue';

definePageMeta({
  title: '组件文档'
});

// 当前活动的部分
const activeSection = ref('persona-selector');

// 滚动到指定部分
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    activeSection.value = sectionId;
  }
};

// 监听滚动事件，更新当前活动的部分
const handleScroll = () => {
  const sections = document.querySelectorAll('section[id]');
  let currentSection = '';
  
  sections.forEach((section) => {
    const htmlSection = section as HTMLElement;
    const sectionTop = htmlSection.offsetTop;
    const sectionHeight = htmlSection.clientHeight;
    
    if (window.scrollY >= sectionTop - 100 && window.scrollY < sectionTop + sectionHeight - 100) {
      currentSection = section.getAttribute('id') || '';
    }
  });
  
  if (currentSection) {
    activeSection.value = currentSection;
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
