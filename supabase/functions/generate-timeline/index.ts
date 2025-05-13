import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Function 'generate-timeline' up and running!");

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  // Handle appropriately
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define expected input structure from synthesize-timing-upload results
interface SynthesisResult {
    segmentIndex: number;
    success: boolean;
    storagePath?: string;
    publicUrl?: string;
    error?: string;
    originalSegmentData?: { // Assuming original data is passed along
        text?: string;
        voiceId?: string;
        speaker?: string; // Example: if speaker info was part of the segment
        [key: string]: any;
    };
}

// Define expected structure for timing data elements
interface TimingInfo {
    startTime: number;
    endTime: number;
    // Add other relevant timing fields if needed (e.g., word timings)
    [key: string]: any;
}

// Define the structure for the output timeline event
interface TimelineEvent {
    type: string; // e.g., "speech", "background", "sfx"
    segmentIndex: number;
    startTime: number;
    endTime: number;
    speaker?: string;
    text?: string;
    audioUrl?: string;
    storagePath?: string;
    synthesisSuccess: boolean;
    error?: string;
}


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Expect synthesis results, timing data, and the target path for the timeline file
    const { synthesisResults, timingData, timelinePath, bucketName = 'timelines' } = await req.json();

    if (!Array.isArray(synthesisResults) || !Array.isArray(timingData) || !timelinePath) {
      return new Response(JSON.stringify({ error: "Missing required fields: 'synthesisResults' array, 'timingData' array, or 'timelinePath'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (synthesisResults.length !== timingData.length) {
       console.warn(`Mismatch between synthesis results (${synthesisResults.length}) and timing data (${timingData.length}). Timeline might be incomplete or inaccurate.`);
       // Decide how to handle this: error out or proceed with caution?
       // For now, proceed but log warning.
    }

    console.log(`Generating timeline for ${synthesisResults.length} segments.`);
    console.log(`Target timeline path: ${timelinePath}, Bucket: ${bucketName}`);

    // 1. Generate timeline structure
    const timelineEvents: TimelineEvent[] = [];
    const minLength = Math.min(synthesisResults.length, timingData.length);

    for (let i = 0; i < minLength; i++) {
        const result: SynthesisResult = synthesisResults[i];
        const timing: TimingInfo = timingData[i];

        const event: TimelineEvent = {
            type: "speech", // Assuming all are speech for now
            segmentIndex: result.segmentIndex ?? i, // Use index from result if available
            startTime: timing.startTime,
            endTime: timing.endTime,
            speaker: result.originalSegmentData?.speaker, // Get speaker if available
            text: result.originalSegmentData?.text,     // Get text if available
            audioUrl: result.publicUrl,
            storagePath: result.storagePath,
            synthesisSuccess: result.success,
            error: result.error,
        };
        timelineEvents.push(event);
    }

    const finalTimeline = {
        metadata: {
            createdAt: new Date().toISOString(),
            sourceSegmentCount: synthesisResults.length,
            sourceTimingCount: timingData.length,
        },
        timeline: timelineEvents,
    };

    // 2. Convert timeline object to Blob
    const timelineBlob = new Blob([JSON.stringify(finalTimeline, null, 2)], { type: "application/json" });

    console.log(`Uploading timeline JSON to ${bucketName}/${timelinePath}`);

    // 3. Upload the timeline file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(timelinePath, timelineBlob, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file exists
        contentType: 'application/json'
      });

    if (uploadError) {
      console.error("Supabase Storage upload error for timeline:", uploadError);
      throw new Error(`Failed to upload timeline: ${uploadError.message}`);
    }

    console.log("Timeline upload successful:", uploadData);

     // 4. (Optional) Get public URL for the timeline file itself
     const { data: urlData } = supabase.storage
       .from(bucketName)
       .getPublicUrl(timelinePath);

    const result = {
        message: "Timeline generated and uploaded successfully.",
        timelinePath: uploadData?.path,
        timelineUrl: urlData?.publicUrl
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error("Error in generate-timeline handler:", error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
     if (error instanceof SyntaxError && req.bodyUsed === false) {
         errorMessage = "Invalid JSON in request body.";
     }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: (error instanceof SyntaxError) ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});