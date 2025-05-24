import { defineEventHandler, getRouterParam, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'
import { consola } from 'consola'

interface AudioSample {
  audio_url: string
  segment_text: string
  created_at: string
  podcast_title?: string
  duration_ms?: number
}

export default defineEventHandler(async (event) => {
  const personaId = getRouterParam(event, 'id')
  
  if (!personaId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Persona ID is required'
    })
  }

  const personaIdNumber = parseInt(personaId, 10)
  if (isNaN(personaIdNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid persona ID format'
    })
  }

  try {
    const supabase = await serverSupabaseClient<Database>(event)

    // First, get the persona to find its name
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('persona_id, name')
      .eq('persona_id', personaIdNumber)
      .single()

    if (personaError || !persona) {
      consola.error('[audio-samples.get] Persona not found:', personaError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Persona not found'
      })
    }

    // Find podcast segments that match this persona's name as speaker
    // and have associated audio files
    const { data: segments, error: segmentsError } = await supabase
      .from('podcast_segments')
      .select(`
        segment_text_id,
        speaker,
        text,
        created_at,
        podcast_id,
        segment_audios!inner (
          audio_url,
          version_tag,
          created_at
        ),
        podcasts (
          title
        )
      `)
      .eq('speaker', persona.name)
      .not('segment_audios.audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10) // Get up to 10 most recent samples

    if (segmentsError) {
      consola.error('[audio-samples.get] Error fetching segments:', segmentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch audio samples'
      })
    }

    if (!segments || segments.length === 0) {
      return {
        success: true,
        persona_id: personaIdNumber,
        persona_name: persona.name,
        samples: [],
        message: 'No audio samples found for this persona'
      }
    }

    // Process and format the audio samples
    const audioSamples: AudioSample[] = segments
      .map(segment => {
        // Get the best available audio (prefer 'final', then any available)
        const finalAudio = segment.segment_audios.find(audio => audio.version_tag === 'final')
        const anyAudio = segment.segment_audios[0]
        const bestAudio = finalAudio || anyAudio

        if (!bestAudio?.audio_url) return null

        return {
          audio_url: bestAudio.audio_url,
          segment_text: segment.text || '',
          created_at: segment.created_at || '',
          podcast_title: Array.isArray(segment.podcasts) ? segment.podcasts[0]?.title : segment.podcasts?.title,
          // Note: duration_ms would need to be added to segment_audios table if needed
        }
      })
      .filter((sample): sample is AudioSample => sample !== null)

    consola.info(`[audio-samples.get] Found ${audioSamples.length} audio samples for persona ${persona.name}`)

    return {
      success: true,
      persona_id: personaIdNumber,
      persona_name: persona.name,
      samples: audioSamples,
      message: `Found ${audioSamples.length} audio sample(s)`
    }

  } catch (error: any) {
    consola.error('[audio-samples.get] Unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
}) 