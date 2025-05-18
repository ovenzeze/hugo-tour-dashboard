<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Gallery Management</h1>
      <Button @click="openAddDialog = true">
        <Icon name="ph:plus" class="w-5 h-5 mr-2" />
        Add Gallery
      </Button>
    </div>
    <Table v-if="galleries.length > 0">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Museum</TableHead>
          <TableHead>Description</TableHead>
          <TableHead class="w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="gallery in galleries" :key="gallery.id">
          <TableCell>{{ gallery.name }}</TableCell>
          <TableCell>
            {{ getMuseumName(gallery.museumId) }}
          </TableCell>
          <TableCell>{{ gallery.description }}</TableCell>
          <TableCell>
            <Button size="sm" variant="outline" @click="editGallery(gallery)">
              <Icon name="ph:pencil" class="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive" class="ml-2" @click="deleteGallery(gallery.id)">
              <Icon name="ph:trash" class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else class="text-muted-foreground text-center py-12">
      No galleries found.
    </div>
    <!-- Add/Edit Dialog -->
    <Dialog v-model:open="openAddDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingGallery ? 'Edit Gallery' : 'Add Gallery' }}</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="submitGallery">
          <div class="grid gap-4 py-4">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <input v-model="form.name" class="input input-bordered w-full" required />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Museum</FormLabel>
              <FormControl>
                <select v-model="form.museumId" class="input input-bordered w-full" required>
                  <option v-for="museum in museums" :key="museum.id" :value="museum.id">
                    {{ museum.name }}
                  </option>
                </select>
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
            <Button type="submit" class="ml-2">{{ editingGallery ? 'Save' : 'Add' }}</Button>
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
}

interface Gallery {
  id: number
  name: string
  museumId: number
  description: string
}

// Example data, replace with API fetch
const museums = ref<Museum[]>([
  { id: 1, name: 'National Museum' }
])

const galleries = ref<Gallery[]>([
  { id: 1, name: 'Ancient Art', museumId: 1, description: 'Ancient artworks.' }
])

const openAddDialog = ref(false)
const editingGallery = ref<Gallery | null>(null)
const form = reactive({
  name: '',
  museumId: museums.value.length > 0 ? museums.value[0].id : 0,
  description: ''
})

function getMuseumName(museumId: number) {
  const museum = museums.value.find(m => m.id === museumId)
  return museum ? museum.name : ''
}

function editGallery(gallery: Gallery) {
  editingGallery.value = gallery
  form.name = gallery.name
  form.museumId = gallery.museumId
  form.description = gallery.description
  openAddDialog.value = true
}

function deleteGallery(id: number) {
  galleries.value = galleries.value.filter(g => g.id !== id)
}

function submitGallery() {
  if (editingGallery.value) {
    // Edit
    editingGallery.value.name = form.name
    editingGallery.value.museumId = form.museumId
    editingGallery.value.description = form.description
  } else {
    // Add
    galleries.value.push({
      id: Date.now(),
      name: form.name,
      museumId: form.museumId,
      description: form.description
    })
  }
  closeDialog()
}

function closeDialog() {
  openAddDialog.value = false
  editingGallery.value = null
  form.name = ''
  form.museumId = museums.value.length > 0 ? museums.value[0].id : 0
  form.description = ''
}
</script>
