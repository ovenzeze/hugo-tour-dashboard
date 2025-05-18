<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-8">Component Library</h1>
    
    <p class="text-gray-600 dark:text-gray-300 mb-8">
      This is the documentation and examples for all reusable components in the project. These components are carefully designed to be reused across different parts of the project, ensuring interface consistency and development efficiency.
    </p>
    
    <!-- Component Categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Form Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5">
          <CardTitle class="flex items-center">
            <Icon name="ph:text-columns" class="mr-2 h-5 w-5" />
            Form Components
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Components for data input and form building, including various input controls and selectors.
          </p>
          <div class="space-y-2">
            <NuxtLink to="/components/persona-selector" class="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <Icon name="ph:user-circle" class="mr-2 h-4 w-4 text-primary" />
              <span>PersonaSelector</span>
              <Badge variant="outline" class="ml-auto">New</Badge>
            </NuxtLink>
            <!-- More component links can be added here -->
          </div>
        </CardContent>
      </Card>
      
      <!-- Data Display Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5">
          <CardTitle class="flex items-center">
            <Icon name="ph:table" class="mr-2 h-5 w-5" />
            Data Display
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Components for displaying data and content, including tables, lists, cards, etc.
          </p>
          <div class="space-y-2">
            <!-- More component links can be added here -->
            <div class="flex items-center p-2 text-gray-400 dark:text-gray-500">
              <span>More components coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <!-- Navigation Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5">
          <CardTitle class="flex items-center">
            <Icon name="ph:navigation-arrow" class="mr-2 h-5 w-5" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Components for page navigation and content organization, including menus, tabs, step indicators, etc.
          </p>
          <div class="space-y-2">
            <!-- More component links can be added here -->
            <div class="flex items-center p-2 text-gray-400 dark:text-gray-500">
              <span>More components coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <!-- Feedback Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5">
          <CardTitle class="flex items-center">
            <Icon name="ph:bell" class="mr-2 h-5 w-5" />
            Feedback
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Components for providing user feedback, including dialogs, notifications, loading states, etc.
          </p>
          <div class="space-y-2">
            <!-- More component links can be added here -->
            <div class="flex items-center p-2 text-gray-400 dark:text-gray-500">
              <span>More components coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <!-- Layout Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5">
          <CardTitle class="flex items-center">
            <Icon name="ph:layout" class="mr-2 h-5 w-5" />
            Layout
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Components for page layout and content arrangement, including grids, columns, containers, etc.
          </p>
          <div class="space-y-2">
            <!-- More component links can be added here -->
            <div class="flex items-center p-2 text-gray-400 dark:text-gray-500">
              <span>More components coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <!-- Business Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5">
          <CardTitle class="flex items-center">
            <Icon name="ph:puzzle-piece" class="mr-2 h-5 w-5" />
            Business Components
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Components for specific business scenarios, including composite components with specialized functionality.
          </p>
          <div class="space-y-2">
            <!-- More component links can be added here -->
            <div class="flex items-center p-2 text-gray-400 dark:text-gray-500">
              <span>More components coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- Development Guide -->
    <div class="mt-12">
      <h2 class="text-2xl font-bold mb-4">Component Development Guide</h2>
      <Card>
        <CardContent class="pt-6">
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold mb-2">Component Design Principles</h3>
              <ul class="list-disc pl-5 space-y-1">
                <li>Components should be reusable with clear responsibilities</li>
                <li>Components should provide reasonable defaults and flexible configuration options</li>
                <li>Components should follow project design specifications and styles</li>
                <li>Components should consider accessibility and internationalization</li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-lg font-semibold mb-2">How to Add New Components</h3>
              <ol class="list-decimal pl-5 space-y-1">
                <li>Create component files in the <code>components</code> directory</li>
                <li>Create corresponding documentation pages in the <code>pages/components</code> directory</li>
                <li>Add component links to the component library homepage</li>
                <li>Write detailed component documentation including props, events, slots, and examples</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Component Library'
});
</script>
