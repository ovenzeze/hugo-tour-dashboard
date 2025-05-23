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

Please return the result in JSON format, structured as shown in the example below, including the generated podcast script segments and voice mapping:

{
"podcastTitle": "Suggested podcast title",
"language": "Suggested language code (e.g., en, zh)",
"script": [
{
"name": "Speaker name (e.g., Alice, Bob)",
"role": "Speaker role (e.g., host, guest)",
"text": "Speaker's text content, can include ElevenLabs SSML <break> tags for pauses."
}
// ... more script segments
],
"voiceMap": {
"Speaker name (e.g., Alice)": {
"personaId": 0, // Corresponding Persona ID
"voice_model_identifier": "Corresponding voice model identifier"
},
"Speaker name (e.g., Bob)": {
"personaId": 1, // Corresponding Persona ID
"voice_model_identifier": "Corresponding voice model identifier"
}
// ... more voice mappings
},
"topic": "Suggested podcast topic",
"style": "Suggested podcast style",
"keywords": "Suggested keywords",
"numberOfSegments": 0 // Suggested number of segments
}
