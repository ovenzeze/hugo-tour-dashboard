<template>
  <div class="persona-selector">
    <Label v-if="label" :for="id" class="mb-2 block">
      {{ label }} 
      <span v-if="multiple" class="ml-2 text-xs text-muted-foreground">
        ({{ selectedPersonas.length }} selected)
      </span>
    </Label>
    
    <!-- Selected personas display (for multiple mode) -->
    <div v-if="multiple && Array.isArray(modelValue) && modelValue.length > 0" class="flex flex-wrap gap-1 mb-2">
      <Badge 
        v-for="persona in selectedPersonas" 
        :key="persona.persona_id" 
        variant="secondary"
        class="flex items-center gap-1 px-2 py-1"
      >
        <span>{{ persona.name }}</span>
        <button 
          type="button" 
          class="rounded-full hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          @click="removePersona(persona)"
        >
          <Icon name="ph:x" class="h-3 w-3" />
          <span class="sr-only">Remove {{ persona.name }}</span>
        </button>
      </Badge>
    </div>

    <Combobox v-model="selectedValue" :multiple="multiple">
      <div class="relative" ref="comboboxRef">
        <div class="flex items-center">
          <ComboboxInput
            :id="id"
            :placeholder="placeholder"
            :disabled="disabled"
            class="w-full flex h-9 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            :value="searchQuery"
            @update:modelValue="searchQuery = $event"
          />
          <div class="absolute right-0 top-0 flex h-9 items-center pr-2">
            <ComboboxTrigger @click="toggleDropdown">
              <Icon name="ph:caret-down" class="h-4 w-4 opacity-50 transition-transform duration-200" :class="{ 'rotate-180': isDropdownOpen }" />
            </ComboboxTrigger>
          </div>
        </div>
        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <ComboboxList
            v-show="isDropdownOpen"
            class="absolute z-50 mt-1.5 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-800/95 text-slate-200 shadow-lg backdrop-blur-sm p-2"
            :style="{ maxHeight: dropdownMaxHeight + 'px', top: dropdownPosition === 'top' ? 'auto' : '100%', bottom: dropdownPosition === 'top' ? '100%' : 'auto' }"
          >
          <ComboboxInput 
            v-if="filterable"
            placeholder="Search personas..."
            class="h-9 px-3 py-2 w-full border-b border-slate-600 mb-1 bg-slate-700/50 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <ComboboxEmpty v-if="filteredPersonas.length === 0" class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-slate-400">
            No personas found.
          </ComboboxEmpty>
          <ComboboxViewport>
            <ComboboxItem 
              v-for="persona in filteredPersonas" 
              :key="persona.persona_id" 
              :value="persona.persona_id"
              class="relative flex cursor-default select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 outline-none data-[highlighted]:bg-sky-600/30 data-[highlighted]:text-sky-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors duration-200"
            >
              <div class="flex items-center gap-3 w-full">
                <Avatar class="h-8 w-8 flex-shrink-0">
                  <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
                  <AvatarFallback>
                    <Icon name="ph:user-circle" class="h-5 w-5 text-slate-400" />
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 overflow-hidden">
                  <span class="text-sm font-medium truncate block">{{ persona.name }}</span>
                  <p v-if="persona.description" class="text-xs text-slate-400 truncate block">
                    {{ persona.description }}
                  </p>
                  <p v-if="persona.scenario" class="text-xs text-slate-500 truncate block mt-0.5">
                    <Icon name="ph:target" class="h-3 w-3 mr-1 inline-block align-text-bottom" /> Scenario: {{ persona.scenario }}
                  </p>
                </div>
                <ComboboxItemIndicator>
                  <Icon name="ph:check" class="h-4 w-4 transition-opacity duration-200" />
                </ComboboxItemIndicator>
              </div>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxList>
        </transition>
      </div>
    </Combobox>
    
    <p v-if="description" class="text-sm text-muted-foreground mt-2">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';

// Import types
import type { ApiPersona } from '~/pages/personas/index.vue';

const props = defineProps<{
  modelValue: number | number[] | null;
  personas?: ApiPersona[];
  multiple?: boolean;
  filterable?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  description?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null];
}>();

// Generate unique ID for the input
const id = `persona-selector-${Math.random().toString(36).substring(2, 9)}`;

// Search query for filtering
const searchQuery = ref('');

// Computed property for the selected value(s)
const selectedValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  }
});

const personas = ref<ApiPersona[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Refs for dropdown positioning
const comboboxRef = ref<HTMLElement | null>(null);
const dropdownPosition = ref<'bottom' | 'top'>('bottom');
const dropdownMaxHeight = ref(300); // 默认最大高度
const isDropdownOpen = ref(false);

// Fetch personas from API if not provided as prop
onMounted(async () => {
  if (!props.personas) {
    loading.value = true;
    try {
      const res = await fetch('/api/personas');
      if (!res.ok) {
        throw new Error('Failed to fetch personas');
      }
      const data = await res.json();
      personas.value = data as ApiPersona[];
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch personas';
    } finally {
      loading.value = false;
    }
  } else {
    personas.value = props.personas;
  }

  // 添加窗口大小变化监听器
  window.addEventListener('resize', calculateDropdownPosition);
});

onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', calculateDropdownPosition);
});

// Computed property for the selected personas
const selectedPersonas = computed(() => {
  if (!props.modelValue) return [];
  const source = personas.value;
  if (props.multiple && Array.isArray(props.modelValue)) {
    const modelValueArray = props.modelValue as number[];
    return source.filter(p => modelValueArray.includes(p.persona_id));
  } else if (!props.multiple && typeof props.modelValue === 'number') {
    return source.filter(p => p.persona_id === props.modelValue);
  }
  return [];
});

// Filtered personas based on search query
const filteredPersonas = computed(() => {
  const source = personas.value;
  if (!searchQuery.value) return source;
  const query = searchQuery.value.toLowerCase();
  return source.filter(persona => 
    persona.name.toLowerCase().includes(query) || 
    (persona.description && persona.description.toLowerCase().includes(query)) ||
    (persona.scenario && persona.scenario.toLowerCase().includes(query))
  );
});

// Function to remove a persona from selection (for multiple mode)
const removePersona = (persona: ApiPersona) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const modelValueArray = props.modelValue as number[];
    emit('update:modelValue', modelValueArray.filter(id => id !== persona.persona_id));
  }
};

// Reset search query when dropdown closes
watch(selectedValue, () => {
  searchQuery.value = '';
});

// 计算下拉菜单位置和最大高度
const calculateDropdownPosition = () => {
  if (!comboboxRef.value) return;

  const rect = comboboxRef.value.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const spaceBelow = windowHeight - rect.bottom;
  const spaceAbove = rect.top;

  // 决定下拉菜单应该向上还是向下展开
  if (spaceBelow < 300 && spaceAbove > spaceBelow) {
    dropdownPosition.value = 'top';
    dropdownMaxHeight.value = Math.min(spaceAbove - 10, 300); // 留出10px的间距
  } else {
    dropdownPosition.value = 'bottom';
    dropdownMaxHeight.value = Math.min(spaceBelow - 10, 300); // 留出10px的间距
  }
};

// 切换下拉菜单的开关状态
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    calculateDropdownPosition();
  }
};

// 监听点击事件，用于关闭下拉菜单
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

const handleOutsideClick = (event: MouseEvent) => {
  if (comboboxRef.value && !comboboxRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
};
</script>

<style scoped>
.persona-selector {
  /* 添加任何需要的样式 */
}

/* 选项的选中状态变化动画 */
.combobox-item-enter-active,
.combobox-item-leave-active {
  transition: background-color 0.2s ease;
}

.combobox-item-enter-from,
.combobox-item-leave-to {
  background-color: transparent;
}

.combobox-item-enter-to,
.combobox-item-leave-from {
  background-color: rgba(14, 165, 233, 0.3); /* sky-600 with 30% opacity */
}
</style>