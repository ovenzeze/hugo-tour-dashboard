<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Museum Management</h1>
      <Button @click="openAddDialog = true">
        <Icon name="ph:plus" class="w-5 h-5 mr-2" />
        Add Museum
      </Button>
    </div>
    <Table v-if="museums.length > 0">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Description</TableHead>
          <TableHead class="w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="museum in museums" :key="museum.id">
          <TableCell>{{ museum.name }}</TableCell>
          <TableCell>{{ museum.location }}</TableCell>
          <TableCell>{{ museum.description }}</TableCell>
          <TableCell>
            <Button size="sm" variant="outline" @click="editMuseum(museum)">
              <Icon name="ph:pencil" class="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive" class="ml-2" @click="deleteMuseum(museum.id)">
              <Icon name="ph:trash" class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else class="text-muted-foreground text-center py-12">
      No museums found.
    </div>
    <!-- Add/Edit Dialog -->
    <Dialog v-model:open="openAddDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingMuseum ? 'Edit Museum' : 'Add Museum' }}</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="submitMuseum">
          <div class="grid gap-4 py-4">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <input v-model="form.name" class="input input-bordered w-full" required />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <input v-model="form.location" class="input input-bordered w-full" required />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <textarea v-model="form.description" class="input input-bordered w-full" rows="3" />
              </FormControl>
            </FormItem>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeDialog">Cancel</Button>
            <Button type="submit" class="ml-2">{{ editingMuseum ? 'Save' : 'Add' }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// UI components auto-imported per project rules
import { ref, reactive } from 'vue'

interface Museum {
  id: number
  name: string
  location: string
  description: string
}

const museums = ref<Museum[]>([
  // Example data, replace with API fetch
  { id: 1, name: 'National Museum', location: 'City Center', description: 'A national-level museum.' }
])

const openAddDialog = ref(false)
const editingMuseum = ref<Museum | null>(null)
const form = reactive({
  name: '',
  location: '',
  description: ''
})

function editMuseum(museum: Museum) {
  editingMuseum.value = museum
  form.name = museum.name
  form.location = museum.location
  form.description = museum.description
  openAddDialog.value = true
}

function deleteMuseum(id: number) {
  museums.value = museums.value.filter(m => m.id !== id)
}

function submitMuseum() {
  if (editingMuseum.value) {
    // Edit
    editingMuseum.value.name = form.name
    editingMuseum.value.location = form.location
    editingMuseum.value.description = form.description
  } else {
    // Add
    museums.value.push({
      id: Date.now(),
      name: form.name,
      location: form.location,
      description: form.description
    })
  }
  closeDialog()
}

function closeDialog() {
  openAddDialog.value = false
  editingMuseum.value = null
  form.name = ''
  form.location = ''
  form.description = ''
}
</script>
