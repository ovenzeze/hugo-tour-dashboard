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
The script should be about a **museum** or a **city**, telling its story with cultural depth and sophistication. The script can use ElevenLabs' <break time="x.xs" />
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
