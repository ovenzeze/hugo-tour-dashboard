<template>
  <div class="space-y-5 p-1">
    <div>
      <Label for="podcastTitle" class="text-base font-semibold">Title</Label>
      <Input
        id="podcastTitle"
        v-model="editableSettings.title"
        placeholder="e.g., The Future of AI"
        class="mt-1.5"
      />
    </div>

    <div>
      <Label for="podcastTopic" class="text-base font-semibold">Topic / Instructions</Label>
      <Textarea
        id="podcastTopic"
        v-model="editableSettings.topic"
        placeholder="Describe in detail what you want the podcast to cover..."
        class="mt-1.5 min-h-[120px]"
      />
    </div>

    <div class="grid grid-cols-1 gap-x-4 gap-y-5">
      <div>
        <Label for="hostPersona" class="text-sm font-medium">Host Character</Label>
        <Select v-model="editableSettings.hostPersonaId">
          <SelectTrigger id="hostPersona" class="mt-1.5 w-full">
            <SelectValue placeholder="Select a host" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel v-if="personasLoading">Loading...</SelectLabel>
              <SelectLabel v-else-if="!personas || personas.length === 0">No characters</SelectLabel>
              <SelectItem
                v-for="persona in personas"
                :key="persona.persona_id"
                :value="String(persona.persona_id)"
              >
                {{ persona.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="text-sm font-medium">Guest Characters</Label>
        <ScrollArea class="mt-1.5 h-[100px] w-full rounded-md border">
          <div class="p-3 space-y-2">
            <p v-if="personasLoading" class="text-xs text-muted-foreground px-1">Loading...</p>
            <p v-else-if="!personas || personas.length === 0 || availableGuestPersonas.length === 0" class="text-xs text-muted-foreground px-1">
              {{ !personas || personas.length === 0 ? 'No characters' : 'No other guests' }}
            </p>
            <div v-for="persona in availableGuestPersonas" :key="persona.persona_id" class="flex items-center space-x-2">
              <Checkbox
                :id="'guest-' + persona.persona_id"
                :checked="isGuestSelected(persona.persona_id)"
                @update:checked="(checked: boolean) => toggleGuestPersona(persona.persona_id, checked)"
              />
              <Label :for="'guest-' + persona.persona_id" class="text-sm font-normal cursor-pointer">
                {{ persona.name }}
              </Label>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 pt-2">
      <div>
        <Label for="podcastSegments" class="text-sm font-medium">Number of Segments</Label>
        <Input
          id="podcastSegments"
          type="number"
          v-model.number="editableSettings.numberOfSegments"
          placeholder="e.g., 3"
          class="mt-1.5"
          min="1"
          max="10"
        />
      </div>

      <div>
        <Label for="podcastStyle" class="text-sm font-medium">Style / Tone</Label>
        <Input
          id="podcastStyle"
          v-model="editableSettings.style"
          placeholder="e.g., Casual, Educational, Storytelling"
          class="mt-1.5"
        />
      </div>

      <div>
        <Label for="podcastKeywords" class="text-sm font-medium">Keywords</Label>
        <Input
          id="podcastKeywords"
          v-model="editableSettings.keywords"
          placeholder="Comma-separated, e.g., AI, ML, Future Tech"
          class="mt-1.5"
        />
      </div>
       <div>
        <Label for="backgroundMusic" class="text-sm font-medium">Background Music (Optional)</Label>
        <Input
          id="backgroundMusic"
          v-model="editableSettings.backgroundMusic"
          placeholder="Theme or style, e.g., Upbeat, Chill Tech"
          class="mt-1.5"
        />
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
// 忽略类型导入的 linter 错误
// @ts-ignore
import type { FullPodcastSettings, Persona } from '~/types/playground';

const props = defineProps<{
  modelValue: FullPodcastSettings;
  personas: Persona[];
  personasLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FullPodcastSettings): void;
}>();

const editableSettings = computed({
  get: () => props.modelValue,
  set: (value) => {
    // 确保正确处理数值类型
    const processedValue = {
      ...value,
      numberOfSegments: Number(value.numberOfSegments) || 1, 
      hostPersonaId: value.hostPersonaId ? Number(value.hostPersonaId) : undefined,
      // 确保 guestPersonaIds 是数组，并且每个元素都是数字
      guestPersonaIds: Array.isArray(value.guestPersonaIds) ? 
                      value.guestPersonaIds
                        .map((id: string | number | undefined) => Number(id))
                        .filter((id: number) => !isNaN(id) && id > 0) : 
                      []
    };
    console.log('编辑表单 - 发送更新:', {
      原始值: value,
      处理后: processedValue,
      guestPersonaIds类型: Array.isArray(processedValue.guestPersonaIds) ? 
                         processedValue.guestPersonaIds.map((id: number) => typeof id) : 
                         'not an array'
    });
    emit('update:modelValue', processedValue);
  }
});

const availableGuestPersonas = computed(() => {
  if (!props.personas) return [];
  return props.personas.filter(p => p.persona_id !== Number(editableSettings.value.hostPersonaId));
});

// 检查嘉宾是否被选中
function isGuestSelected(personaId: number): boolean {
  if (!Array.isArray(editableSettings.value.guestPersonaIds)) {
    return false;
  }
  
  const numericPersonaId = Number(personaId);
  // 确保使用 Number() 进行比较，避免类型不匹配问题
  return editableSettings.value.guestPersonaIds.some((id: number | string | undefined) => 
    Number(id) === numericPersonaId
  );
}

function toggleGuestPersona(personaId: number, isChecked: boolean) {
  console.log('toggleGuestPersona 调用:', { personaId, isChecked });
  
  // 获取当前嘉宾列表的副本
  let guestPersonaIds = Array.isArray(editableSettings.value.guestPersonaIds) ? 
                        [...editableSettings.value.guestPersonaIds] : 
                        [];
  
  // 确保所有 ID 都是数字
  guestPersonaIds = guestPersonaIds.map((id: string | number | undefined) => Number(id))
                                  .filter((id: number) => !isNaN(id));
                        
  console.log('当前嘉宾:', { 
    guestPersonaIds, 
    类型: typeof guestPersonaIds, 
    是数组: Array.isArray(guestPersonaIds),
    长度: guestPersonaIds.length
  });
  
  const numericPersonaId = Number(personaId);

  if (isChecked) {
    // 添加嘉宾（如果不存在）
    if (!guestPersonaIds.includes(numericPersonaId)) {
      guestPersonaIds.push(numericPersonaId);
      console.log('添加嘉宾:', numericPersonaId);
    }
  } else {
    // 移除嘉宾
    const index = guestPersonaIds.indexOf(numericPersonaId);
    if (index > -1) {
      guestPersonaIds.splice(index, 1);
      console.log('移除嘉宾:', numericPersonaId);
    }
  }
  
  console.log('更新后的嘉宾:', guestPersonaIds);
  
  // 创建一个新的设置对象，确保 guestPersonaIds 是数字数组
  const updatedSettings = { 
    ...editableSettings.value, 
    guestPersonaIds: guestPersonaIds 
  };
  
  console.log('发送更新:', { 
    guestPersonaIds: updatedSettings.guestPersonaIds,
    类型: typeof updatedSettings.guestPersonaIds,
    是数组: Array.isArray(updatedSettings.guestPersonaIds)
  });
  
  // 更新设置
  emit('update:modelValue', updatedSettings);
}

watch(() => props.modelValue.hostPersonaId, (newHostId: number | string | undefined) => {
  const numericNewHostId = Number(newHostId);
  if (Array.isArray(editableSettings.value.guestPersonaIds) && editableSettings.value.guestPersonaIds.includes(numericNewHostId)) {
    const updatedGuests = editableSettings.value.guestPersonaIds.filter((id: number) => id !== numericNewHostId);
    emit('update:modelValue', { ...editableSettings.value, guestPersonaIds: updatedGuests });
  }
});

</script>
