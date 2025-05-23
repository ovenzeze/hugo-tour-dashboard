<template>
  <Badge 
    :variant="badgeVariant"
    :class="badgeClass"
  >
    <Icon :name="statusIcon" class="h-3 w-3 mr-1" />
    {{ statusLabel }}
  </Badge>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Status = 'active' | 'inactive' | 'deprecated';

const props = defineProps<{
  status: Status;
  size?: 'sm' | 'md';
}>();

const statusConfig = {
  active: {
    label: 'Active',
    icon: 'ph:check-circle',
    variant: 'default' as const,
    class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
  },
  inactive: {
    label: 'Inactive',
    icon: 'ph:pause-circle',
    variant: 'secondary' as const,
    class: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  },
  deprecated: {
    label: 'Deprecated',
    icon: 'ph:warning-circle',
    variant: 'destructive' as const,
    class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
  }
};

const config = computed(() => statusConfig[props.status] || statusConfig.active);

const statusLabel = computed(() => config.value.label);
const statusIcon = computed(() => config.value.icon);
const badgeVariant = computed(() => config.value.variant);

const badgeClass = computed(() => {
  const baseClasses = config.value.class;
  const sizeClasses = props.size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return `${baseClasses} ${sizeClasses}`;
});
</script> 