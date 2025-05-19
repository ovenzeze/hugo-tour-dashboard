Title: {{title}}
Topic: {{topic}}
Format: Podcast Dialogue
Host: {{hostName}}
Guests: {{guestNames}}
Style: {{style}}
Keywords: {{keywords}}
Number of Segments: {{numberOfSegments}}
Background Music: {{backgroundMusic}}
Voice Map: {{voiceMapJson}}

Generate a complete podcast script containing dialogue between the host and guests. The script should clearly indicate each speaker's name and develop content around the topic, adhering to the specified style and keywords.

**Important Instructions for Museum Selection and Storytelling:**
*   **Time-Based Museum Selection:** Use the current timestamp ({{currentTime}}) to select a museum or historical site from a specific historical period. Follow this pattern:
    - If the minute is 0-15: Focus on ancient civilizations (before 500 CE)
    - If the minute is 16-30: Focus on medieval to renaissance period (500-1500 CE)
    - If the minute is 31-45: Focus on early modern period (1500-1900 CE)
    - If the minute is 46-59: Focus on modern and contemporary museums (1900 CE-present)
*   **Geographic Diversity:** Based on the day of the month, rotate through different geographical regions:
    - Days 1-7: Museums/sites in Asia
    - Days 8-14: Museums/sites in Europe
    - Days 15-21: Museums/sites in Americas
    - Days 22-28: Museums/sites in Africa
    - Days 29-31: Museums/sites in Oceania or specialized museums (science, technology, etc.)
*   **Narrative Depth:** The script should focus on telling the compelling **stories behind the selected museum and its significant collections or artifacts**. Explore the history, cultural context, and unique narratives associated with them. Go beyond simple descriptions.
*   **Highlight Lesser-Known Facts:** Include at least one surprising or lesser-known fact about the museum or its collections that would intrigue listeners.

The script should be about the chosen museum, telling its story with cultural depth and sophistication. The script can use ElevenLabs' <break time="x.xs" />
for inserting pauses of specified duration (maximum 3 seconds). This is the most direct and recommended way to control pauses. However, please note that pause duration cannot exceed 3 seconds and should not be used too frequently.

Please return the result in JSON format, structured as shown in the example below.

**Crucial Instructions for Speaker Names and Voice Map:**
*   For all `script.name` fields, you **MUST** use the exact speaker names provided in the 'Host: {{hostName}}' and 'Guests: {{guestNames}}' input fields from the top of this prompt.
*   For the keys in the `voiceMap` object, you **MUST** also use these exact speaker names ({{hostName}} and {{guestNames}}).
*   The `personaId` and `voice_model_identifier` for each speaker in the `voiceMap` **MUST** be taken directly from the input `Voice Map: {{voiceMapJson}}` provided above.
*   **Do NOT invent new speaker names or alter the provided personaId/voice_model_identifier.** The `voiceMap` you return should accurately reflect which of the *provided* personas are used in the script, using their *original* names and voice details.

Example JSON structure:
{
"podcastTitle": "Suggested podcast title",
"language": "Suggested language code (e.g., en, zh-CN, es). This MUST match the language used in the script.",
"script": [
{
"name": "{{hostName}}", // MUST be the exact host name from input
"role": "host",
"text": "Speaker's text content, can include ElevenLabs SSML <break> tags for pauses."
},
{
"name": "AN_EXACT_GUEST_NAME_FROM_INPUT_guestNames", // MUST be one of the exact guest names from {{guestNames}} if a guest speaks
"role": "guest",
"text": "Speaker's text content..."
}
// ... more script segments, always using exact names from {{hostName}} or {{guestNames}}
],
"voiceMap": {
// The keys here MUST be the exact names from {{hostName}} and {{guestNames}} that are actually used in the script.
// The personaId and voice_model_identifier MUST be copied from the input {{voiceMapJson}}.
"{{hostName}}": {
"personaId": "personaId for {{hostName}} from input {{voiceMapJson}}",
"voice_model_identifier": "voice_model_identifier for {{hostName}} from input {{voiceMapJson}}"
},
"AN_EXACT_GUEST_NAME_FROM_INPUT_guestNames_IF_USED": {
"personaId": "personaId for this guest from input {{voiceMapJson}}",
"voice_model_identifier": "voice_model_identifier for this guest from input {{voiceMapJson}}"
}
// ... include mappings ONLY for speakers actually present in the generated script.
},
"topic": "Suggested podcast topic",
"style": "Suggested podcast style",
"keywords": "Suggested keywords",
"numberOfSegments": 0 // Suggested number of segments
}
