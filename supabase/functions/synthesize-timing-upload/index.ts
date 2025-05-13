import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { synthesizeSpeechSegment } from '../_shared/elevenlabsUtils.ts'; // Import the new util

console.log("Function 'synthesize-timing-upload' up and running!");

// DEBUG: Print ELEVENLABS_API_KEY to check if it's loaded
console.log("DEBUG: ELEVENLABS_API_KEY from Deno.env:", Deno.env.get('ELEVENLABS_API_KEY'));

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  // In a real scenario, might want to throw or return an error response immediately
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define expected input structure for a segment
interface InputSegment {
  text: string;
  voiceId: string;
  // Optional synthesis parameters per segment
  stability?: number;
  similarityBoost?: number;
  // Add other relevant fields from your parsed script if needed
  [key: string]: any; // Allow other properties
}

// Define the structure for the result of processing a single segment
interface SegmentResult {
    segmentIndex: number;
    success: boolean;
    storagePath?: string;
    publicUrl?: string;
    error?: string;
    originalSegmentData?: InputSegment; // Optionally include original data for context
}


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Expect an array of segments and a base path prefix for uploads
    const { segments, targetPathPrefix, bucketName = 'audio-outputs' } = await req.json();

    if (!Array.isArray(segments) || segments.length === 0 || !targetPathPrefix) {
      return new Response(JSON.stringify({ error: "Missing required fields: 'segments' array or 'targetPathPrefix'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
     if (!Deno.env.get('ELEVENLABS_API_KEY')) {
         return new Response(JSON.stringify({ error: "Server configuration error: ELEVENLABS_API_KEY is not set." }), {
             status: 500,
             headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
     }


    console.log(`Received ${segments.length} segments to synthesize.`);
    console.log(`Target path prefix: ${targetPathPrefix}, Bucket: ${bucketName}`);

    const results: SegmentResult[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment: InputSegment = segments[i];
      const segmentResult: SegmentResult = { segmentIndex: i, success: false, originalSegmentData: segment };

      if (!segment.text || !segment.voiceId) {
        console.error(`Segment ${i} is missing text or voiceId.`);
        segmentResult.error = "Segment missing text or voiceId.";
        results.push(segmentResult);
        continue; // Skip to the next segment
      }

      try {
        console.log(`Synthesizing segment ${i}: Voice ${segment.voiceId}, Text: "${segment.text.substring(0, 50)}..."`);

        // 1. Synthesize audio using ElevenLabs util
        const audioBlob = await synthesizeSpeechSegment(
          segment.text,
          segment.voiceId,
          undefined, // Use API key from env var
          segment.modelId || 'eleven_multilingual_v2', // Allow overriding model per segment
          segment.stability,
          segment.similarityBoost
        );

        // 2. Define storage path for this segment
        // Ensure prefix ends with a slash if it doesn't already
        const prefix = targetPathPrefix.endsWith('/') ? targetPathPrefix : `${targetPathPrefix}/`;
        const segmentFileName = `segment_${i}.mp3`; // Simple naming convention
        const storagePath = `${prefix}${segmentFileName}`;

        console.log(`Uploading segment ${i} to ${bucketName}/${storagePath}`);

        // 3. Upload audio Blob to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, audioBlob, {
            cacheControl: '3600',
            upsert: true, // Overwrite if file exists
            contentType: 'audio/mpeg'
          });

        if (uploadError) {
          console.error(`Supabase Storage upload error for segment ${i}:`, uploadError);
          throw new Error(`Failed to upload audio for segment ${i}: ${uploadError.message}`);
        }

        console.log(`Segment ${i} upload successful:`, uploadData);
        segmentResult.success = true;
        segmentResult.storagePath = uploadData?.path; // Store the actual path returned

        // 4. (Optional) Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
        segmentResult.publicUrl = urlData?.publicUrl;


      } catch (error: any) {
        console.error(`Error processing segment ${i}:`, error);
        segmentResult.error = error.message || "Unknown error during synthesis or upload.";
      }
      results.push(segmentResult);
    } // End loop through segments

    console.log("Finished processing all segments.");

    // Return the array of results for each segment
    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error("Error in synthesize-timing-upload handler:", error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred"; // Changed const to let
    // Check if it's a JSON parsing error specifically
     if (error instanceof SyntaxError && req.bodyUsed === false) {
         errorMessage = "Invalid JSON in request body.";
     }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: (error instanceof SyntaxError) ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});