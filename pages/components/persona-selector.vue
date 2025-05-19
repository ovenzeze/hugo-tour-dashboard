<template>
  <div class="container mx-auto py-8 px-4">
    <!-- Breadcrumb Navigation -->
    <div class="flex items-center text-sm mb-6">
      <NuxtLink to="/components" class="text-gray-500 hover:text-primary">Components</NuxtLink>
      <Icon name="ph:caret-right" class="mx-2 h-4 w-4 text-gray-400" />
      <span class="font-medium">PersonaSelector</span>
    </div>
    
    <!-- Component Title -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold">PersonaSelector</h1>
        <p class="text-gray-600 dark:text-gray-300 mt-2">
          An advanced persona selector supporting single and multiple selection with search.
        </p>
      </div>
      <Badge variant="outline">Form Component</Badge>
    </div>
    
    <!-- Component Overview -->
    <Card class="mb-8">
      <CardContent class="pt-6">
        <p>
          PersonaSelector is an advanced selector built on the shadcn/ui Combobox component, designed for selecting personas. It supports both single and multiple selection modes, provides search filtering, and displays selected items as tags. Suitable for scenarios where one or more personas need to be selected from a list.
        </p>
      </CardContent>
    </Card>
    
    <!-- Component Examples -->
    <div class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Examples</h2>
      
      <!-- Basic Usage -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle>Basic Usage</CardTitle>
          <CardDescription>
            The most basic single selection mode, select one persona from the list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" class="p-4 border rounded-md mt-2">
              <div class="max-w-md mx-auto">
                <PersonaSelector
                  v-model="selectedHost"
                  :personas="availablePersonas"
                  placeholder="Select host"
                />
              </div>
            </TabsContent>
            <TabsContent value="code" class="mt-2">
              <CodeBlock language="vue" class="rounded-md my-2">
&lt;template&gt;
&lt;PersonaSelector
  v-model="selectedHost"
  :personas="availablePersonas"
  placeholder="Select host"
/&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import type { ApiPersona } from '~/types/persona';
import PersonaSelector from '~/components/PersonaSelector.vue';

const selectedHost = ref&lt;number | null&gt;(null);
const availablePersonas = ref&lt;ApiPersona[]&gt;([
{ persona_id: 1, name: 'Historian', description: 'Focuses on historical events and cultural background', avatar_url: '/avatars/historian.png', system_prompt: 'You are a historian.', greeting_message: 'Greetings! How can I assist you with history today?' },
{ persona_id: 2, name: 'Scientist', description: 'Explains scientific concepts clearly', avatar_url: '/avatars/scientist.png', system_prompt: 'You are a scientist.', greeting_message: 'Hello! Ready to explore the wonders of science?' },
{ persona_id: 3, name: 'Artist', description: 'Discusses art and creativity', avatar_url: '/avatars/artist.png', system_prompt: 'You are an artist.', greeting_message: 'Welcome! Let\'s talk about art.' },
{ persona_id: 4, name: 'Chef', description: 'Shares recipes and cooking tips', avatar_url: '/avatars/chef.png', system_prompt: 'You are a chef.', greeting_message: 'Bon appétit! What culinary delights can I help you with?' },
{ persona_id: 5, name: 'Developer', description: 'Helps with coding problems', avatar_url: '/avatars/developer.png', system_prompt: 'You are a software developer.', greeting_message: 'Hey there, fellow coder! Stuck on something?' }
]);
&lt;/script&gt;
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <!-- Multiple Selection Mode -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle>Multiple Selection Mode</CardTitle>
          <CardDescription>
            Enable multiple selection by setting the <code>multiple</code> prop to <code>true</code>, allowing selection of multiple personas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" class="p-4 border rounded-md mt-2">
              <div class="max-w-md mx-auto">
                <PersonaSelectorExample :multiple="true" />
              </div>
            </TabsContent>
            <TabsContent value="code" class="mt-2">
              <CodeBlock language="vue" class="rounded-md my-2">
&lt;template&gt;
&lt;PersonaSelector
  v-model="selectedPersonas"
  :personas="personas"
  :multiple="true"
  label="Select Multiple Personas"
  placeholder="Search persona..."
  description="Please select multiple personas as guests"
  :filterable="true"
/&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref } from 'vue';
import type { ApiPersona } from '~/types/persona';
import PersonaSelector from '~/components/PersonaSelector.vue';

const selectedPersonas = ref&lt;number[]&gt;([]);
const personas = ref&lt;ApiPersona[]&gt;([
{ persona_id: 1, name: 'Historian', description: 'Focuses on historical events and cultural background', avatar_url: '/avatars/historian.png', system_prompt: 'You are a historian.', greeting_message: 'Greetings! How can I assist you with history today?' },
{ persona_id: 2, name: 'Scientist', description: 'Explains scientific concepts clearly', avatar_url: '/avatars/scientist.png', system_prompt: 'You are a scientist.', greeting_message: 'Hello! Ready to explore the wonders of science?' },
{ persona_id: 3, name: 'Artist', description: 'Discusses art and creativity', avatar_url: '/avatars/artist.png', system_prompt: 'You are an artist.', greeting_message: 'Welcome! Let\'s talk about art.' },
{ persona_id: 4, name: 'Chef', description: 'Shares recipes and cooking tips', avatar_url: '/avatars/chef.png', system_prompt: 'You are a chef.', greeting_message: 'Bon appétit! What culinary delights can I help you with?' },
{ persona_id: 5, name: 'Developer', description: 'Helps with coding problems', avatar_url: '/avatars/developer.png', system_prompt: 'You are a software developer.', greeting_message: 'Hey there, fellow coder! Stuck on something?' }
]);
&lt;/script&gt;
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <!-- Disabled State -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle>Disabled State</CardTitle>
          <CardDescription>
            Disable the selector by setting the <code>disabled</code> prop to <code>true</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" class="p-4 border rounded-md mt-2">
              <div class="max-w-md mx-auto">
                <PersonaSelectorExample :disabled="true" />
              </div>
            </TabsContent>
            <TabsContent value="code" class="mt-2">
              <CodeBlock language="vue" class="rounded-md my-2">
&lt;template&gt;
&lt;PersonaSelector
  v-model="selectedPersona"
  :personas="personas"
  label="Select Persona"
  placeholder="Search persona..."
  description="This selector is disabled"
  :filterable="true"
  :disabled="true"
/&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref } from 'vue';
import type { ApiPersona } from '~/types/persona';
import PersonaSelector from '~/components/PersonaSelector.vue';

const selectedPersona = ref&lt;number | null&gt;(null);
const personas = ref&lt;ApiPersona[]&gt;([
{ persona_id: 1, name: 'Historian', description: 'Focuses on historical events and cultural background', avatar_url: '/avatars/historian.png', system_prompt: 'You are a historian.', greeting_message: 'Greetings! How can I assist you with history today?' },
{ persona_id: 2, name: 'Scientist', description: 'Explains scientific concepts clearly', avatar_url: '/avatars/scientist.png', system_prompt: 'You are a scientist.', greeting_message: 'Hello! Ready to explore the wonders of science?' },
{ persona_id: 3, name: 'Artist', description: 'Discusses art and creativity', avatar_url: '/avatars/artist.png', system_prompt: 'You are an artist.', greeting_message: 'Welcome! Let\'s talk about art.' }
]);
&lt;/script&gt;
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import PersonaSelectorExample from '~/components/PersonaSelectorExample.vue';

definePageMeta({
  title: 'PersonaSelector Component'
});
</script>