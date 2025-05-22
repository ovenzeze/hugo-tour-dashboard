---
keywords: [volcengine, tts, speech synthesis, voice, timestamp]
---

# VolcEngine Text-to-Speech (TTS)

## Feature Overview

VolcEngine TTS API is one of the core features of this project, allowing text to be converted into natural and fluent speech. Key features include:

- Support for multiple voice options (such as general female voice, general male voice, etc.)
- Support for timestamp functionality to get pronunciation timing for each character
- Support for adjusting speech rate, volume, and pitch

## Usage

### Direct Python Script Call

You can directly test the VolcEngine TTS API through the `volcengine_tts_demo.py` script:

```bash
python volcengine_tts_demo.py --text "Text to synthesize" --voice female --output output.mp3
```

### Environment Variables Configuration

Using VolcEngine TTS API requires configuring the following environment variables:

- `NUXT_VOLCENGINE_APPID`: VolcEngine AppID
- `NUXT_VOLCENGINE_ACCESS_TOKEN`: VolcEngine Access Token
- `NUXT_VOLCENGINE_SECRET_KEY`: VolcEngine Secret Key
- `NUXT_VOLCENGINE_CLUSTER`: VolcEngine Cluster
- `VOLCENGINE_VOICE_TYPE`: Optional, defaults to "BV001_streaming"

## Timestamp Functionality

Timestamp functionality is an important feature of the VolcEngine TTS API, which can get the pronunciation timing for each character in the following format:

```json
{
  "timestamps": [
    {
      "text": "Hello",
      "start_time": 0,
      "end_time": 250
    },
    {
      "text": "World",
      "start_time": 250,
      "end_time": 500
    },
    ...
  ]
}
```

To enable timestamp functionality, ensure that the `need_timestamps` parameter is set to 1 in the API request.

## Common Issues

1. **API Returns Error**: Please check if environment variables are correctly configured, especially AppID, Access Token, and Cluster.
2. **No Timestamp Information**: Please confirm if your account has permission to use timestamp functionality and that the `need_timestamps` parameter is correctly set in the request.
3. **Audio Quality Issues**: Try adjusting speech rate, volume, and pitch parameters, or switch to different voice types.