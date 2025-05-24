<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Personas</h1>
        <p class="text-sm text-muted-foreground mt-1">管理您的角色配置和语音设置</p>
      </div>
      <div>
        <Button @click="openAddPersonaDialog" class="gap-1.5">
          <Icon name="ph:plus" class="h-4 w-4" />
          <span>Add Persona</span>
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="w-full mb-6">
      <div class="bg-background border rounded-lg p-3 shadow-sm">
        <div class="flex items-center gap-4">
          <!-- 标题 -->
          <div class="flex items-center gap-2 text-sm font-medium">
            <Icon name="ph:funnel" class="h-4 w-4 text-primary" />
            Filters
          </div>
          
          <!-- 筛选器组 -->
          <div class="flex items-center gap-3 flex-1">
            <!-- 搜索 -->
            <div class="relative min-w-[200px]">
              <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchTerm"
                placeholder="Search personas..."
                class="pl-10 h-8 text-sm"
              />
            </div>
            
            <!-- 状态选择器 -->
            <div class="flex items-center bg-muted rounded-md p-1">
              <Button 
                :variant="statusFilter === 'all' ? 'default' : 'ghost'" 
                size="sm"
                @click="statusFilter = 'all'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                All
              </Button>
              <Button 
                :variant="statusFilter === 'active' ? 'default' : 'ghost'" 
                size="sm"
                @click="statusFilter = 'active'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:check-circle" class="mr-1 h-3 w-3" />
                Active
              </Button>
              <Button 
                :variant="statusFilter === 'inactive' ? 'default' : 'ghost'" 
                size="sm"
                @click="statusFilter = 'inactive'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:pause-circle" class="mr-1 h-3 w-3" />
                Inactive
              </Button>
              <Button 
                :variant="statusFilter === 'deprecated' ? 'default' : 'ghost'" 
                size="sm"
                @click="statusFilter = 'deprecated'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:x-circle" class="mr-1 h-3 w-3" />
                Deprecated
              </Button>
            </div>
            
            <!-- 语言选择器 -->
            <div class="flex items-center bg-muted rounded-md p-1">
              <Button
                :variant="languageFilter === 'all' ? 'default' : 'ghost'"
                size="sm"
                @click="languageFilter = 'all'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:globe" class="mr-1 h-3 w-3" />
                All
              </Button>
              <Button
                v-for="lang in availableLanguages.slice(0, 3)"
                :key="lang"
                :variant="languageFilter === lang ? 'default' : 'ghost'"
                size="sm"
                @click="languageFilter = lang"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <div class="flex items-center gap-1">
                  <span class="text-sm">{{ getLanguageFlag(lang) }}</span>
                  <span class="hidden sm:inline">{{ lang }}</span>
                </div>
              </Button>
              <!-- 更多语言按钮 -->
              <Button
                v-if="availableLanguages.length > 3"
                variant="ghost"
                size="sm"
                @click="showMoreLanguages = !showMoreLanguages"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:dots-three" class="h-3 w-3" />
                <span class="hidden sm:inline ml-1">+{{ availableLanguages.length - 3 }}</span>
              </Button>
            </div>
            
            <!-- 展开的更多语言 -->
            <div v-if="showMoreLanguages && availableLanguages.length > 3" 
                 class="flex items-center bg-muted rounded-md p-1 ml-2">
              <Button
                v-for="lang in availableLanguages.slice(3)"
                :key="`extra-${lang}`"
                :variant="languageFilter === lang ? 'default' : 'ghost'"
                size="sm"
                @click="selectLanguage(lang)"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <div class="flex items-center gap-1">
                  <span class="text-sm">{{ getLanguageFlag(lang) }}</span>
                  <span class="hidden sm:inline">{{ lang }}</span>
                </div>
              </Button>
            </div>
          </div>
          
          <!-- 统计和重置 -->
          <div class="flex items-center gap-3 text-sm">
            <span class="text-muted-foreground whitespace-nowrap">{{ filteredPersonas.length }} results</span>
            <Button variant="ghost" size="sm" @click="resetFilters" class="h-8 px-3 text-sm">
              <Icon name="ph:arrow-clockwise" class="mr-1 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Card View for all screen sizes -->
    <div class="mt-8">
      <div v-if="pending" class="space-y-4 py-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="space-y-4 p-4 border rounded-xl shadow-md bg-white/95 dark:bg-zinc-900/90">
            <div class="flex items-center space-x-3 mb-3">
              <Skeleton class="h-8 w-8 rounded-full" />
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-4 w-1/4 ml-auto" />
            </div>
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <div class="flex justify-between mt-4">
              <Skeleton class="h-4 w-1/3" />
              <Skeleton class="h-4 w-1/3" />
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="text-center py-4">
        <p class="text-red-500">Failed to load personas: {{ error.message }}</p>
      </div>
      <div v-else-if="filteredPersonas && filteredPersonas.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <PersonaCard
          v-for="persona in filteredPersonas"
          :key="persona.persona_id"
          :persona="persona"
          @edit="editPersona"
          @delete="confirmDeletePersona"
          @view-details="viewPersonaDetails"
          @updated="handlePersonaUpdated"
        />
      </div>
      <div v-else-if="searchTerm || statusFilter !== 'all' || languageFilter !== 'all'" class="text-center py-16 px-4 border-2 border-dashed border-muted rounded-xl bg-muted/5">
        <div class="flex flex-col items-center max-w-md mx-auto">
          <Icon name="ph:magnifying-glass" class="h-16 w-16 text-muted-foreground/60" />
          <h3 class="mt-4 text-lg font-medium">No Personas Found</h3>
          <p class="mt-2 text-sm text-muted-foreground">No personas match your current filters. Try adjusting your search criteria.</p>
          <div class="mt-6">
            <Button @click="resetFilters" size="lg" class="gap-2">
              <Icon name="ph:arrow-clockwise" class="h-5 w-5" />
              <span>Clear Filters</span>
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-16 px-4 border-2 border-dashed border-muted rounded-xl bg-muted/5">
        <div class="flex flex-col items-center max-w-md mx-auto">
          <Icon name="ph:users-three" class="h-16 w-16 text-muted-foreground/60" />
          <h3 class="mt-4 text-lg font-medium">No Personas Found</h3>
          <p class="mt-2 text-sm text-muted-foreground">创建一个新的角色来开始使用语音合成和对话功能。</p>
          <div class="mt-6">
            <Button @click="openAddPersonaDialog" size="lg" class="gap-2">
              <Icon name="ph:plus-circle" class="h-5 w-5" />
              <span>Create Persona</span>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <AlertDialog :open="!!personaToDelete" @update:open="personaToDelete = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the persona.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="deletePersona(personaToDelete!)">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog :open="showEditDialog" @update:open="showEditDialog = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Persona</DialogTitle>
          <DialogDescription>
            Make changes to your persona here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div v-if="editingPersona" class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">Name</Label>
            <Input id="name" v-model="editingPersona.name" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="description" class="text-right">Description</Label>
            <Textarea id="description" v-model="editingPersonaDescription" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="system_prompt" class="text-right">System Prompt</Label>
            <Textarea id="system_prompt" v-model="editingPersonaSystemPrompt" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="voice_settings" class="text-right">Voice Settings</Label>
            <Textarea id="voice_settings" v-model="editingPersonaVoiceSettings" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="status" class="text-right">Status</Label>
            <Select @value-change="(val: string) => { if (editingPersona) editingPersona.status = val as 'active' | 'inactive' | 'deprecated'; }">
              <SelectTrigger class="col-span-3">
                <SelectValue :placeholder="editingPersona?.status || 'Select status'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="showEditDialog = false">Cancel</Button>
          <Button type="submit" @click="saveEditedPersona">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Persona</DialogTitle>
          <DialogDescription>
            Fill in the details for the new persona. Click create when you're done.
          </DialogDescription>
        </DialogHeader>
        <form @submit="onAddSubmit">
          <div class="grid gap-4 py-4">
            <FormField v-slot="{ componentField }" name="name">
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Persona name" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="description">
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Persona description (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="system_prompt">
              <FormItem>
                <FormLabel>System Prompt</FormLabel>
                <FormControl>
                  <Textarea placeholder="System prompt (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="voice_settings">
              <FormItem>
                <FormLabel>Voice Settings</FormLabel>
                <FormControl>
                  <Textarea placeholder="Voice settings (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="avatar_url">
              <FormItem>
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/avatar.png (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="status">
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select v-bind="componentField">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="showAddDialog = false">Cancel</Button>
            <Button type="submit">Create Persona</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { toast } from 'vue-sonner';
import * as z from 'zod';

// Define a more specific type for what the API returns, including potential joins
export interface ApiPersona {
  persona_id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  scenario: string | null;
  status: 'active' | 'inactive' | 'deprecated';
  system_prompt: string | null;
  voice_settings: string | null; // Assuming this might be JSON or structured string
  voice_description?: string | null;
  tts_provider?: string | null;
  language_support?: string[] | null;
  voice_model_identifier?: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Recommendation fields
  is_recommended_host?: boolean | null;
  is_recommended_guest?: boolean | null;
  recommended_priority?: number | null;
}

const personaToDelete = ref<number | null>(null);
const showEditDialog = ref(false);
const editingPersona = ref<ApiPersona | null>(null);
const showAddDialog = ref(false);

// 筛选器相关变量
const searchTerm = ref('');
const statusFilter = ref('all');
const languageFilter = ref('all');
const showMoreLanguages = ref(false);
const availableLanguages = ref<string[]>([]);

const editingPersonaDescription = computed({
  get: () => editingPersona.value?.description || '',
  set: (val) => {
    if (editingPersona.value) {
      editingPersona.value.description = val;
    }
  }
});

const editingPersonaSystemPrompt = computed({
  get: () => editingPersona.value?.system_prompt || '',
  set: (val) => {
    if (editingPersona.value) {
      editingPersona.value.system_prompt = val;
    }
  }
});

const editingPersonaVoiceSettings = computed({
  get: () => editingPersona.value?.voice_settings || '',
  set: (val) => {
    if (editingPersona.value) {
      editingPersona.value.voice_settings = val;
    }
  }
});
// Zod schema for Add Persona form
const addPersonaFormSchema = toTypedSchema(z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  description: z.string().max(500).optional().nullable(),
  system_prompt: z.string().max(500).optional().nullable(),
  voice_settings: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')).nullable(),
  status: z.enum(['active', 'inactive', 'deprecated']).default('active'),
}));

const { handleSubmit: handleAddSubmit, resetForm: resetAddForm, setValues: setAddFormValues } = useForm({
  validationSchema: addPersonaFormSchema,
  initialValues: {
    name: '',
    description: null,
    system_prompt: null,
    voice_settings: null,
    avatar_url: null,
    status: 'active' as const,
  }
});

const onAddSubmit = handleAddSubmit(async (values) => {
  await saveNewPersona(values);
});

watch(showAddDialog, (newValue) => {
  if (newValue) {
    resetAddForm({
      values: {
        name: '',
        description: null,
        system_prompt: null,
        voice_settings: null,
        avatar_url: null,
        status: 'active' as const,
      }
    });
  }
});

const { data: personas, pending, error, refresh: refreshPersonas } = await useAsyncData('personas',
  () => $fetch('/api/personas'), {
    transform: (data: any) => {
      return Array.isArray(data) ? data.map(p => ({ ...p, status: p.status || 'active' })) : []
    }
  }
);

// 提取可用语言
watch(personas, (newPersonas) => {
  if (newPersonas && newPersonas.length > 0) {
    const languages = new Set<string>();
    newPersonas.forEach(persona => {
      if (persona.language_support && Array.isArray(persona.language_support)) {
        persona.language_support.forEach(lang => languages.add(lang));
      }
    });
    availableLanguages.value = Array.from(languages).sort();
  }
}, { immediate: true });

// 筛选后的personas
const filteredPersonas = computed(() => {
  if (!personas.value) return [];
  
  let result = personas.value;
  
  // 搜索筛选
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase();
    result = result.filter(persona =>
      (persona.name && persona.name.toLowerCase().includes(lowerSearchTerm)) ||
      (persona.description && persona.description.toLowerCase().includes(lowerSearchTerm))
    );
  }
  
  // 状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(persona => persona.status === statusFilter.value);
  }
  
  // 语言筛选
  if (languageFilter.value !== 'all') {
    result = result.filter(persona => {
      if (!persona.language_support || !Array.isArray(persona.language_support)) {
        return false;
      }
      return persona.language_support.includes(languageFilter.value);
    });
  }
  
  return result;
});

// 重置筛选器
const resetFilters = () => {
  searchTerm.value = '';
  statusFilter.value = 'all';
  languageFilter.value = 'all';
  showMoreLanguages.value = false;
};

// 获取语言对应的国旗
const getLanguageFlag = (lang: string) => {
  const languageFlags: Record<string, string> = {
    'English': '🇬🇧',
    'Chinese': '🇨🇳',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Spanish': '🇪🇸',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Portuguese': '🇵🇹',
    'Russian': '🇷🇺',
    'Arabic': '🇦🇪',
    'Hindi': '🇮🇳'
  };
  return languageFlags[lang] || '🌐';
};

// 选择语言并关闭更多语言面板
const selectLanguage = (lang: string) => {
  languageFilter.value = lang;
  showMoreLanguages.value = false;
};

const openAddPersonaDialog = () => {
  resetAddForm({
    values: {
      name: '',
      description: null,
      system_prompt: null,
      voice_settings: null,
      avatar_url: null,
      status: 'active' as const,
    }
  });
  showAddDialog.value = true;
};

async function saveNewPersona(formData: Partial<ApiPersona>) {
  try {
    await $fetch('/api/personas', {
      method: 'POST',
      body: formData,
    });
    toast({ title: 'Success', description: 'Persona created successfully.' });
    refreshPersonas(); 
    showAddDialog.value = false;
  } catch (e: any) {
    let description = 'Failed to create persona.';
    if (e instanceof Error) {
      description = e.message;
    } else if (e && typeof e.data?.message === 'string') {
      description = e.data.message;
    } else if (typeof e === 'string') {
      description = e;
    }
    toast({ title: 'Error Creating Persona', description, variant: 'destructive' });
    console.error('Failed to create persona:', e);
  }
}

const editPersona = (id: number) => {
  const foundPersona = personas.value?.find(p => p.persona_id === id);
  if (foundPersona) {
    editingPersona.value = {
      ...foundPersona,
      description: foundPersona.description ?? '',
      system_prompt: foundPersona.system_prompt ?? '',
      voice_settings: foundPersona.voice_settings ?? '',
      status: foundPersona.status || 'active',
    };
    showEditDialog.value = true;
  }
};

async function saveEditedPersona() {
  if (!editingPersona.value) return;
  try {
    await $fetch(`/api/personas/${editingPersona.value.persona_id}`, {
      method: 'PUT',
      body: editingPersona.value,
    });
    toast({ title: 'Success', description: 'Persona updated successfully.' });
    refreshPersonas();
    showEditDialog.value = false;
  } catch (e: any) {
    let description = 'Failed to update persona.';
    if (e instanceof Error) {
      description = e.message;
    } else if (e && typeof e.data?.message === 'string') {
      description = e.data.message;
    } else if (typeof e === 'string') {
      description = e;
    }
    toast({ title: 'Error Updating Persona', description, variant: 'destructive' });
    console.error('Failed to update persona:', e);
  }
};

const confirmDeletePersona = (id: number) => {
  console.log('Attempting to delete persona:', id);
  personaToDelete.value = id;
};

async function deletePersona(id: number) {
  try {
    await $fetch(`/api/personas/${id}`, {
      method: 'DELETE',
    });
    toast({ title: 'Success', description: 'Persona deleted successfully.' });
    refreshPersonas();
    personaToDelete.value = null;
  } catch (error: unknown) { 
    let description = 'Failed to delete persona.';
    const originalError = error; 

    if (error instanceof Error) {
      description = error.message;
    } else if (typeof error === 'string') {
      description = error;
    } else if (error && typeof error === 'object') {
      const errObj = error as { message?: string; data?: { message?: string } };
      if (errObj.data && typeof errObj.data.message === 'string') {
        description = errObj.data.message;
      } else if (typeof errObj.message === 'string') {
        description = errObj.message;
      }
    }

    toast({ title: 'Error Deleting Persona', description, variant: 'destructive' });
    console.error(`User-facing error: "${description}". Original error object:`, originalError);
  }
};

const viewPersonaDetails = (id: number) => {
  useNuxtApp().$alert(`View persona details for persona ${id}`);
};

// Handle persona updates from the card component
const handlePersonaUpdated = (updatedPersona: ApiPersona) => {
  // Refresh the personas data to reflect the changes
  refreshPersonas();
};

definePageMeta({
  title: 'Personas Management'
});
</script>
