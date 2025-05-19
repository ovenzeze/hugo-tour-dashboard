import { createError, defineEventHandler, readBody } from 'h3';
// import { serverSupabaseClient } from '#supabase/server'; // Not used in this file after refactor
// import type { Database } from '~/types/supabase'; // Not used in this file after refactor
import {
  generateLLMPrompt,
  validateStructuredData,
  callLLMForPodcastValidation,
  // generateMockResponse, // Not used in production flow, can be kept out or imported if needed for debugging
} from '~/server/utils/podcastValidationHelpers';
import type {
  RequestBody,
  // ScriptSegment, // Used within ValidateResponseData
  ValidateResponseData
} from '~/server/utils/podcastValidationHelpers';

// Helper function to validate URL format
const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

// Define the main response structure for this endpoint
interface ValidatePostResponse {
  success: boolean;
  structuredData?: ValidateResponseData;
  message?: string;
  error?: string;
}

export default defineEventHandler(async (event): Promise<ValidatePostResponse> => {
  try {
    console.log('[validate.post] Starting script validation process');
    
    // 1. Read request body
    const body = await readBody(event) as RequestBody;
    console.log('[validate.post] Received request body:', { 
      title: body.title, 
      scriptLength: body.rawScript?.length,
      hasPersonas: !!body.personas,
      hostPersonaPresent: !!body.personas?.hostPersona,
      guestPersonasCount: body.personas?.guestPersonas?.length || 0,
      preferences: body.preferences ? Object.keys(body.preferences) : 'none'
    });
    
    // 2. Validate necessary parameters
    if (!body.rawScript || !body.title) {
      console.warn('[validate.post] Missing required fields: rawScript or title');
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: rawScript and title'
      });
    }
    
    if (!body.personas || !body.personas.hostPersona) {
      console.warn('[validate.post] Missing host persona information');
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing host persona information'
      });
    }

    // 2.1 Validate cover_image_url if provided
    if (body.cover_image_url && !isValidUrl(body.cover_image_url)) {
      console.warn('[validate.post] Invalid cover_image_url format');
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid cover_image_url format. Please provide a valid URL.'
      });
    }

    // Log host and guest details
    console.log('[validate.post] Host persona details:', {
      id: body.personas.hostPersona.id,
      name: body.personas.hostPersona.name,
      hasVoiceModel: !!body.personas.hostPersona.voice_model_identifier
    });

    if (body.personas.guestPersonas && body.personas.guestPersonas.length > 0) {
      console.log('[validate.post] Guest personas details:', body.personas.guestPersonas.map(guest => ({
        id: guest.id,
        name: guest.name,
        hasVoiceModel: !!guest.voice_model_identifier
      })));
    } else {
      console.warn('[validate.post] No guest personas provided');
    }
    
    // 3. Prepare LLM prompt
    console.log('[validate.post] Generating LLM prompt');
    const prompt = generateLLMPrompt(body);
    console.log('[validate.post] Generated prompt length:', prompt.length);
    
    // 4. Call OpenRouter API (or other LLM service)
    console.log('[validate.post] Calling LLM service');
    
    // Actual call to LLM API
    const structuredData: ValidateResponseData = await callLLMForPodcastValidation(prompt, event);
    
    console.log('[validate.post] Received LLM response:', JSON.stringify(structuredData).substring(0, 200) + '...');
    
    // 5. Simple validation of the structure returned by LLM
    console.log('[validate.post] Validating structured data');
    const validationResult = validateStructuredData(structuredData);
    
    if (!validationResult.valid) {
      console.error('[validate.post] Validation failed:', validationResult.error);
      return {
        success: false,
        error: validationResult.error
      } as ValidatePostResponse; // Added type assertion
    }
    
    console.log('[validate.post] Validation successful');
    
    // Log script segments count and voice mapping
    console.log('[validate.post] Script segments count:', structuredData.script?.length || 0);
    console.log('[validate.post] Voice mapping keys:', Object.keys(structuredData.voiceMap || {}));
    
    // 6. Return successful result
    return {
      success: true,
      structuredData: structuredData,
      message: 'Script validation and structuring successful'
    } as ValidatePostResponse; // Added type assertion
    
  } catch (error: any) {
    console.error('[validate.post] Error during script validation:', error);
    console.error('[validate.post] Error details:', {
      statusCode: error.statusCode || 500,
      message: error.message || 'Unknown error',
      stack: error.stack
    });
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Script validation failed: ${error.message || 'Unknown error'}`
    });
  }
});

// All helper functions (generateMockResponse, generateLLMPrompt, callLLM, validateStructuredData)
// and their related interfaces (RequestBody, ScriptSegment, ValidateResponse)
// have been moved to server/utils/podcastValidationHelpers.ts
