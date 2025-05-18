<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Object Management</h1>
      <Button @click="openAddDialog = true">
        <Icon name="ph:plus" class="w-5 h-5 mr-2" />
        Add Object
      </Button>
    </div>
    <Table v-if="objects.length > 0">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Gallery</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Image</TableHead>
          <TableHead class="w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="object in objects" :key="object.id">
          <TableCell>{{ object.name }}</TableCell>
          <TableCell>
            {{ getGalleryName(object.galleryId) }}
          </TableCell>
          <TableCell>{{ object.description }}</TableCell>
          <TableCell>
            <img v-if="object.image" :src="object.image" class="w-16 h-16 object-cover rounded" />
            <span v-else class="text-muted-foreground">No image</span>
          </TableCell>
          <TableCell>
            <Button size="sm" variant="outline" @click="editObject(object)">
              <Icon name="ph:pencil" class="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive" class="ml-2" @click="deleteObject(object.id)">
              <Icon name="ph:trash" class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else class="text-muted-foreground text-center py-12">
      No objects found.
    </div>
    <!-- Add/Edit Dialog -->
    <Dialog v-model:open="openAddDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingObject ? 'Edit Object' : 'Add Object' }}</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="submitObject">
          <div class="grid gap-4 py-4">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <input v-model="form.name" class="input input-bordered w-full" required />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Gallery</FormLabel>
              <FormControl>
                <select v-model="form.galleryId" class="input input-bordered w-full" required>
                  <option v-for="gallery in galleries" :key="gallery.id" :value="gallery.id">
                    {{ gallery.name }}
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
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <input v-model="form.image" class="input input-bordered w-full" placeholder="https://..." />
              </FormControl>
            </FormItem>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeDialog">Cancel</Button>
            <Button type="submit" class="ml-2">{{ editingObject ? 'Save' : 'Add' }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// UI components auto-imported per project rules
import { ref, reactive } from 'vue'

interface Gallery {
  id: number
  name: string
}

interface ObjectItem {
  id: number
  name: string
  galleryId: number
  description: string
  image: string
}

// Example data, replace with API fetch
const galleries = ref<Gallery[]>([
  { id: 1, name: 'Ancient Art' }
])

const objects = ref<ObjectItem[]>([
  { id: 1, name: 'Bronze Statue', galleryId: 1, description: 'A bronze statue from the Han dynasty.', image: '' }
])

const openAddDialog = ref(false)
const editingObject = ref<ObjectItem | null>(null)
const form = reactive({
  name: '',
  galleryId: galleries.value.length > 0 ? galleries.value[0].id : 0,
  description: '',
  image: ''
})

function getGalleryName(galleryId: number) {
  const gallery = galleries.value.find(g => g.id === galleryId)
  return gallery ? gallery.name : ''
}

function editObject(object: ObjectItem) {
  editingObject.value = object
  form.name = object.name
  form.galleryId = object.galleryId
  form.description = object.description
  form.image = object.image
  openAddDialog.value = true
}

function deleteObject(id: number) {
  objects.value = objects.value.filter(o => o.id !== id)
}

function submitObject() {
  if (editingObject.value) {
    // Edit
    editingObject.value.name = form.name
    editingObject.value.galleryId = form.galleryId
    editingObject.value.description = form.description
    editingObject.value.image = form.image
  } else {
    // Add
    objects.value.push({
      id: Date.now(),
      name: form.name,
      galleryId: form.galleryId,
      description: form.description,
      image: form.image
    })
  }
  closeDialog()
}

function closeDialog() {
  openAddDialog.value = false
  editingObject.value = null
  form.name = ''
  form.galleryId = galleries.value.length > 0 ? galleries.value[0].id : 0
  form.description = ''
  form.image = ''
}
</script>
