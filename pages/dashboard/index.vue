<template>
  <div class="flex-1 space-y-4 p-4 md:p-8 pt-6">


    <Tabs default-value="overview" class="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">
          Overview
        </TabsTrigger>
        <TabsTrigger value="analytics" disabled>
          Analytics
        </TabsTrigger>
        <TabsTrigger value="reports" disabled>
          Reports
        </TabsTrigger>
        <TabsTrigger value="notifications" disabled>
          Notifications
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <Icon name="ph:currency-dollar-simple" class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">$45,231.89</div>
              <p class="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">
                Subscriptions
              </CardTitle>
              <Icon name="ph:users" class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">+2350</div>
              <p class="text-xs text-muted-foreground">
                +180.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Sales</CardTitle>
              <Icon name="ph:credits-card" class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">+12,234</div>
              <p class="text-xs text-muted-foreground">
                +19% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Active Now</CardTitle>
              <Icon name="ph:activity" class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">+573</div>
              <p class="text-xs text-muted-foreground">
                +201 since last hour
              </p>
            </CardContent>
          </Card>
        </div>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card class="col-span-4">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent class="pl-2">
              <!-- Chart Placeholder -->
              <div class="h-[350px] w-full bg-secondary/30 flex items-center justify-center rounded-md">
                <p class="text-muted-foreground">Chart placeholder</p>
              </div>
            </CardContent>
          </Card>
          <Card class="col-span-4 lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                You made 265 sales this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-8">
                <div v-for="sale in recentSales" :key="sale.email" class="flex items-center">
                  <Avatar class="h-9 w-9">
                    <AvatarImage :src="sale.avatarUrl" :alt="sale.name" />
                    <AvatarFallback>{{ sale.fallback }}</AvatarFallback>
                  </Avatar>
                  <div class="ml-4 space-y-1">
                    <p class="text-sm font-medium leading-none">{{ sale.name }}</p>
                    <p class="text-sm text-muted-foreground">{{ sale.email }}</p>
                  </div>
                  <div class="ml-auto font-medium">{{ sale.amount }}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
// Using Nuxt's built-in Icon component instead of Iconify
// import { Icon } from '@iconify/vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

definePageMeta({
  title: 'Dashboard Overview'
});

const recentSales = [
  {
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    amount: '+$1,999.00',
    avatarUrl: '/images/avatars/01.png',
    fallback: 'OM',
  },
  {
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    amount: '+$39.00',
    avatarUrl: '/images/avatars/02.png',
    fallback: 'JL',
  },
  {
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    amount: '+$299.00',
    avatarUrl: '/images/avatars/03.png',
    fallback: 'IN',
  },
  {
    name: 'William Kim',
    email: 'will@email.com',
    amount: '+$99.00',
    avatarUrl: '/images/avatars/04.png',
    fallback: 'WK',
  },
  {
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    amount: '+$39.00',
    avatarUrl: '/images/avatars/05.png',
    fallback: 'SD',
  },
]
</script>

<style scoped>
/* Add any page-specific styles here */
</style>
