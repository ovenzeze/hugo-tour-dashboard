import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await client.from('personas').select('*').order('name') // Added order by name

  if (error) {
    console.error('Error fetching personas:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch personas: ${error.message}`,
    })
  }

  return data
})
