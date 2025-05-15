Title: {{title}}
Topic: {{topic}}
Format: Podcast Dialogue
Host: {{hostName}}
Guests: {{guestNames}}
Style: {{style}}
Keywords: {{keywords}}
Number of Segments: {{numberOfSegments}}
Background Music: {{backgroundMusic}}

Generate a complete podcast script containing dialogue between the host and guests. The script should clearly indicate each speaker's name and develop content around the topic, adhering to the specified style and keywords.

**Important Instructions for Museum Selection and Storytelling:**
*   **Unique Museum Focus:** For each podcast script generation, select a **different museum** that has not been the subject of a previous script in this session or context. Aim for variety.
*   **Narrative Depth:** The script should focus on telling the compelling **stories behind the selected museum and its significant collections or artifacts**. Explore the history, cultural context, and unique narratives associated with them. Go beyond simple descriptions.

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
