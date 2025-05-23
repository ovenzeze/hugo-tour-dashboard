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
Available Personas: {{availablePersonasJson}}

Generate a complete podcast script containing dialogue between the host and guests. The script should clearly indicate each speaker's name and develop content around the topic, adhering to the specified style and keywords.

**CRITICAL: NATURAL CONVERSATION AND INTERACTION**
*   **Create Authentic Dialogue:** The script MUST feel like a natural conversation between real people, NOT like separate individuals reading their own prepared statements.
*   **Build on Each Other's Comments:** Each speaker should actively respond to, build upon, or react to what the previous speaker said. Show listening and engagement.
*   **Use Interactive Elements:** Include the following conversational patterns:
    - **Questions and Follow-ups:** Speakers should ask each other questions, seek clarification, and show curiosity
    - **Agreements and Disagreements:** Natural "Yes, exactly!" or "But wait, I think differently about..." moments
    - **Interruptions and Overlaps:** Occasional "Oh, that reminds me..." or "Speaking of which..." transitions
    - **Emotional Reactions:** Express surprise, excitement, concern, or humor in response to others' points
    - **Personal Anecdotes:** Share relevant personal experiences or memories triggered by the discussion
    - **Cross-References:** "As [Speaker Name] mentioned earlier..." or "Building on what you said about..."
*   **Conversational Flow Indicators:** Use phrases like:
    - "That's fascinating! It reminds me of..."
    - "Wait, can you elaborate on that?"
    - "I had no idea! What else..."
    - "You're absolutely right, and another thing..."
    - "That's interesting, but have you considered..."
    - "Oh my goodness, really?"
    - "I was just about to say the same thing!"
*   **Avoid Lecture Mode:** Prevent speakers from delivering long monologues. Keep exchanges dynamic with frequent back-and-forth.
*   **Show Active Listening:** Include verbal acknowledgments like "Mmm-hmm," "Right," "Exactly," or "Wow" to show engagement.

**CRITICAL: RESPECT USER-SELECTED PERSONAS**
*   The user has specifically selected `Host: {{hostName}}` and `Guests: {{guestNames}}` for this podcast.
*   These are NOT suggestions - they are MANDATORY selections that you MUST use.
*   **DO NOT** choose different personas from the `Available Personas` list unless the user-selected ones are not present in that list.
*   The `Available Personas: {{availablePersonasJson}}` list is provided for reference and to ensure the selected personas exist, NOT for you to make alternative choices.
*   **ALWAYS** prioritize using `{{hostName}}` as the host and personas from `{{guestNames}}` as guests in your script.

When selecting speakers for dialogue, **you MUST use the personas specified by the user**:
*   Host: `{{hostName}}`
*   Guests: `{{guestNames}}`

Only if a specified persona is completely missing from the `Available Personas` list should you consider using an alternative from that list.

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
*   You are provided with a list of `Available Personas: {{availablePersonasJson}}`. This is your primary source for validating the selected personas exist.
*   The fields `Host: {{hostName}}` and `Guests: {{guestNames}}` are the REQUIRED roles selected by the user. You MUST use these exact personas.
*   The `Voice Map: {{voiceMapJson}}` provides the voice details for these user-selected roles.
*   **CRITICAL**: For any speaker in the script, you MUST use the `"speaker"` field (NOT "name") in each script segment:
    *   The value in `script[].speaker` **MUST** exactly match `{{hostName}}` for host segments and one of the names from `{{guestNames}}` for guest segments.
    *   **DO NOT** use personas from `Available Personas` unless the user-specified persona is missing from that list.
*   For the `voiceMap` object you return:
    *   The keys **MUST** be the exact names `{{hostName}}` and names from `{{guestNames}}` that are used in the script.
    *   The `personaId` and `voice_model_identifier` for each speaker **MUST** be taken directly from the input `{{voiceMapJson}}`.
*   **Do NOT invent new speaker names or substitute different personas.** You must use the personas the user specifically selected: `{{hostName}}` and `{{guestNames}}`.

**VERY IMPORTANT JSON FORMAT REQUIREMENTS:**
*   Each script segment MUST use `"speaker"` field (NOT "name")
*   Each script segment MUST use `"role"` field  
*   Each script segment MUST use `"text"` field
*   The exact format is: `{"speaker": "PersonaName", "role": "host|guest", "text": "content"}`
*   For host segments: `"speaker"` MUST be exactly `{{hostName}}`
*   For guest segments: `"speaker"` MUST be exactly one of the names from `{{guestNames}}`

Example JSON structure:
{
"podcastTitle": "Suggested podcast title",
"language": "Suggested language code (e.g., en, zh-CN, es). This MUST match the language used in the script.",
"script": [
{
"speaker": "{{hostName}}", // MUST be the exact host name - this is REQUIRED, not optional
"role": "host",
"text": "Speaker's text content, can include ElevenLabs SSML <break> tags for pauses."
},
{
"speaker": "ONE_OF_THE_EXACT_GUEST_NAMES_FROM_{{guestNames}}", // MUST be exactly one of the guest names provided
"role": "guest",
"text": "Speaker's text content..."
}
// ... more script segments, ONLY using {{hostName}} and names from {{guestNames}}
],
"voiceMap": {
// ONLY include the personas that are actually used in the script from the user's selection
"{{hostName}}": {
"personaId": "personaId for {{hostName}} from input {{voiceMapJson}}",
"voice_model_identifier": "voice_model_identifier for {{hostName}} from input {{voiceMapJson}}"
},
"EXACT_GUEST_NAME_IF_USED_IN_SCRIPT": {
"personaId": "personaId for this guest from input {{voiceMapJson}}",
"voice_model_identifier": "voice_model_identifier for this guest from input {{voiceMapJson}}"
}
// ... include mappings ONLY for user-selected personas actually used in the script
},
"topic": "Suggested podcast topic",
"style": "Suggested podcast style", 
"keywords": "Suggested keywords",
"numberOfSegments": 0 // Suggested number of segments
}
