import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

console.log("Function 'parse-script' up and running!");

// Define expected input structure
interface VoiceConfig {
  [speakerTag: string]: string; // Maps speaker_tag to voice_id
}

interface DefaultSynthesisParams {
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

interface ParseScriptRequestBody {
  dialogueScript: string;
  podcastTitle: string;
  voiceConfig: VoiceConfig;
  defaultSynthesisParams?: DefaultSynthesisParams;
  outputBucketName?: string;
}

// Define output segment structure
interface OutputSegment {
  text: string;
  voiceId: string;
  speakerTag: string;
  modelId: string;
  stability?: number;
  similarityBoost?: number;
  originalLineNumber: number;
}

// Regex to parse "[speaker_tag]:[content]"
const SCRIPT_LINE_REGEX = /^\[([^\]]+)\]:(.*)$/;

function sanitizeToPath(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '');
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as ParseScriptRequestBody;
    const {
      dialogueScript,
      podcastTitle,
      voiceConfig,
      defaultSynthesisParams = {}, // Provide default empty object
      outputBucketName = 'audio-outputs'
    } = body;

    if (!dialogueScript || !podcastTitle || !voiceConfig) {
      return new Response(JSON.stringify({ error: "Missing required fields: 'dialogueScript', 'podcastTitle', or 'voiceConfig'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = dialogueScript.split('\n').filter(line => line.trim() !== ''); // Split by newline and remove empty lines
    const parsedSegments: OutputSegment[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(SCRIPT_LINE_REGEX);

      if (!match) {
        errors.push(`Error parsing line ${i + 1}: "${line}". Format must be [SpeakerTag]:Content.`);
        continue; // Skip this line or decide to fail fast
      }

      const speakerTag = match[1].trim();
      const text = match[2].trim();

      if (!text) {
        errors.push(`Error on line ${i + 1}: Content for speaker [${speakerTag}] is empty.`);
        continue;
      }

      const voiceId = voiceConfig[speakerTag];
      if (!voiceId) {
        errors.push(`Error on line ${i + 1}: No voiceId configured for speaker tag "[${speakerTag}]" in voiceConfig.`);
        continue;
      }

      // Apply default synthesis params, can be extended to allow per-speaker overrides from voiceConfig if needed
      const modelId = defaultSynthesisParams.modelId || 'eleven_multilingual_v2';
      const stability = defaultSynthesisParams.stability;
      const similarityBoost = defaultSynthesisParams.similarityBoost;

      parsedSegments.push({
        text,
        voiceId,
        speakerTag,
        modelId,
        stability,
        similarityBoost,
        originalLineNumber: i + 1,
      });
    }

    if (errors.length > 0) {
      // If there were parsing errors, return them
      return new Response(JSON.stringify({
        error: "Script parsing failed with errors.",
        details: errors,
        parsedSegments // Optionally return partially parsed segments for debugging
      }), {
        status: 400, // Bad Request due to script format issues
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsedSegments.length === 0 && lines.length > 0) {
         return new Response(JSON.stringify({ error: "Script parsing resulted in no valid segments. Check script format and voiceConfig."}), {
             status: 400,
             headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
    }


    const sanitizedTitle = sanitizeToPath(podcastTitle);
    if (!sanitizedTitle) {
        return new Response(JSON.stringify({ error: "Invalid podcastTitle, resulted in empty path component."}), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    const targetPathPrefix = `podcasts/${sanitizedTitle}/segments`;

    const responsePayload = {
      segments: parsedSegments,
      targetPathPrefix: targetPathPrefix,
      bucketName: outputBucketName,
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error("Error in parse-script handler:", error);
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