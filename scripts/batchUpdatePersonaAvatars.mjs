import pg from 'pg';
import { setTimeout } from 'timers/promises';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const LOG_FILE_PATH = path.join(process.cwd(), 'batchUpdatePersonaAvatars.log');

// --- Log Stream Setup ---
const logStream = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' });

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const logToFile = (message, ...optionalParams) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message} ${optionalParams.join(' ')}\n`;
  logStream.write(formattedMessage);
};

console.log = (...args) => {
  originalConsoleLog.apply(console, args);
  logToFile('INFO:', ...args);
};

console.warn = (...args) => {
  originalConsoleWarn.apply(console, args);
  logToFile('WARN:', ...args);
};

console.error = (...args) => {
  originalConsoleError.apply(console, args);
  logToFile('ERROR:', ...args);
};

// --- Configuration ---
const DB_CONFIG = {
  user: 'postgres',
  host: 'db.jazocztbwzavmtyprhye.supabase.co',
  database: 'postgres',
  password: 'tuq.huf6HGZ9tpy3wfq', // Sensitive: Consider environment variables for production
  port: 5432,
};

const IMAGE_API_URL = 'http://localhost:3000/api/ai/image/generate';
const API_CALL_DELAY_MS = 1000; // Delay between API calls to avoid rate limiting

// --- Database Client ---
const pool = new pg.Pool(DB_CONFIG);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// --- Helper Functions ---

async function getActivePersonas() {
  const client = await pool.connect();
  try {
    // Modified to fetch all active personas for forced regeneration
    const res = await client.query(
      "SELECT persona_id, name, description FROM public.personas WHERE is_active = true;"
    );
    console.log(`Found ${res.rowCount} active personas for forced avatar regeneration.`);
    return res.rows;
  } finally {
    client.release();
  }
}

function createImagePrompt(personaName, personaDescription) {
  // Consistent prompt structure, incorporating persona-specific details
  // Use case: Modern, realistic, detailed, and friendly tour guide
  return `Highly realistic portrait of ${personaName}, a modern and friendly tour guide. ${personaDescription}. Detailed facial features with a warm, welcoming smile and kind eyes. Professional attire suitable for a contemporary tour guide. High-quality studio lighting, sharp focus, subtle background. Consistent style for a tour guide series.`;
}

async function generateImage(prompt) {
  try {
    console.log(`Generating image with prompt: "${prompt}"`);
    const response = await fetch(IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    if (!data.imageUrl) {
      throw new Error('API response did not include an imageUrl.');
    }
    console.log(`Generated image URL: ${data.imageUrl}`);
    return data.imageUrl;
  } catch (error) {
    console.error(`Error generating image for prompt "${prompt}":`, error.message);
    return null; // Allow script to continue with other personas
  }
}

async function updatePersonaAvatar(personaId, avatarUrl) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'UPDATE public.personas SET avatar_url = $1 WHERE persona_id = $2',
      [avatarUrl, personaId]
    );
    if (res.rowCount > 0) {
      console.log(`Successfully updated avatar for persona_id: ${personaId}`);
    } else {
      console.warn(`Could not find persona_id: ${personaId} to update.`);
    }
  } finally {
    client.release();
  }
}

// --- Main Script Logic ---
async function main() {
  console.log('Starting batch persona avatar update process...');

  let personas;
  try {
    personas = await getActivePersonas();
  } catch (error) {
    console.error('Failed to retrieve personas from database:', error);
    process.exit(1);
  }

  if (!personas || personas.length === 0) {
    console.log('No active personas found that need an avatar update. Exiting.');
    await pool.end();
    return;
  }

  for (const persona of personas) {
    console.log(`\nProcessing Persona ID: ${persona.persona_id}, Name: ${persona.name}`);

    const prompt = createImagePrompt(persona.name, persona.description);
    const imageUrl = await generateImage(prompt);

    if (imageUrl) {
      try {
        await updatePersonaAvatar(persona.persona_id, imageUrl);
      } catch (error) {
        console.error(`Failed to update database for persona_id ${persona.persona_id}:`, error);
      }
    } else {
      console.warn(`Skipping database update for persona_id ${persona.persona_id} due to image generation failure.`);
    }
    // Add a delay to be respectful to the API
    if (personas.indexOf(persona) < personas.length - 1) {
        console.log(`Waiting for ${API_CALL_DELAY_MS / 1000} seconds before next API call...`);
        await setTimeout(API_CALL_DELAY_MS);
    }
  }

  console.log('\nBatch persona avatar update process finished.');
  await pool.end();
  logStream.end();
}

main().catch((err) => {
  console.error('Unhandled error in main script:', err);
  pool.end().finally(() => {
    logStream.end(() => process.exit(1));
  });
});
