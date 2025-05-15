---
title: Podcast Generation Database Design
description: Technical documentation of the database schema and design principles for podcast generation functionality
author: GitHub Copilot (based on system design)
date: 2025-05-15
updatedAt: 2025-05-15
tags: ["database", "schema", "design", "podcast", "audio", "tts"]
---

# Podcast Generation Database Design

The podcast generation feature in Hugo Tour Dashboard uses a relational database model to store podcast metadata, segments, and associated audio data. This document describes the database structure, relationships, and design principles behind the podcast functionality.

## Database Structure Overview

The podcast generation database consists of three primary tables that work together to store and organize podcast content:

```
┌─────────────┐
│  podcasts   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ podcast_segments │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ segment_audios  │
└─────────────────┘
```

This hierarchical structure allows the system to:
- Store podcast metadata independently of content
- Manage individual speech segments with speaker information
- Associate multiple audio versions with each segment (different voice parameters, models, etc.)

## Database Tables

### podcasts

Stores metadata about podcast episodes.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | string (UUID) | PRIMARY KEY | Unique identifier for the podcast |
| title | string | NOT NULL | Podcast title |
| topic | string | | Optional podcast topic or theme |
| created_at | timestamp with time zone | DEFAULT now() | Record creation timestamp |

### podcast_segments

Stores individual segments (speech units) of a podcast.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | string (UUID) | PRIMARY KEY | Unique identifier for the segment |
| podcast_id | string (UUID) | FOREIGN KEY | Reference to parent podcast |
| idx | integer | NOT NULL | Order index of the segment within the podcast |
| speaker | string | | Name of the speaker for this segment |
| text | string | | Text content of the segment |
| created_at | timestamp with time zone | DEFAULT now() | Record creation timestamp |

### segment_audios

Stores audio versions for podcast segments.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | string (UUID) | PRIMARY KEY | Unique identifier for the audio version |
| segment_id | string (UUID) | FOREIGN KEY | Reference to parent segment |
| audio_url | string | | URL to the synthesized audio file |
| version_tag | string | | Tag identifying the synthesis version (e.g., "v1") |
| params | JSON | | Parameters used for synthesis (e.g., temperature, stability) |
| created_at | timestamp with time zone | DEFAULT now() | Record creation timestamp |

## Relationships

### Foreign Keys

- **podcast_segments.podcast_id → podcasts.id**:
  Links each segment to its parent podcast. This enables efficient querying of all segments for a specific podcast.

- **segment_audios.segment_id → podcast_segments.id**:
  Links each audio version to its parent segment. This allows multiple audio versions for the same text segment (with different voice parameters).

## Design Principles

The podcast database schema adheres to the following design principles:

### 1. Separation of Concerns

The three-table design separates:
- Podcast metadata (title, topic)
- Textual content (segments with speaker and text)
- Audio synthesis results (audio files with synthesis parameters)

This separation allows each aspect to evolve independently.

### 2. Flexible Content Management

- **Multiple Speakers**: The `speaker` field in `podcast_segments` allows for conversations involving any number of participants
- **Ordered Segments**: The `idx` field maintains proper segment sequencing
- **Parameter Storage**: The `params` JSON field in `segment_audios` stores synthesis settings for reproducibility

### 3. Version Control

The `version_tag` in `segment_audios` enables:
- Multiple synthesis attempts per segment
- Different voice parameter combinations
- Audio quality improvements over time

### 4. Integration with Personas System

While not directly linked via foreign keys, the podcast system integrates with the `personas` table through the API layer:

- Speaker names in podcast_segments can be matched to persona names
- Voice model IDs from personas are used during audio synthesis
- This loose coupling provides flexibility in voice assignments

## API Integration

The database schema supports the podcast processing API workflow:

1. **Script Processing**: Creates records in `podcasts` and `podcast_segments` tables
2. **Audio Synthesis**: Creates records in `segment_audios` table with URLs to generated files
3. **Timeline Generation**: Uses data from all three tables to create a timeline for merging
4. **Audio Merging**: Uses the timeline to produce final podcast files

## Data Flow

```
┌───────┐       ┌────────────┐       ┌─────────────┐       ┌─────────────┐
│ Input │──────▶│ podcasts   │──────▶│ segments    │──────▶│ synthesis   │
│ Script│       │ (metadata) │       │ (text data) │       │ (audio data)│
└───────┘       └────────────┘       └─────────────┘       └─────────────┘
                                                                  │
┌─────────────┐       ┌────────────┐                              │
│ Final       │◀──────│ Timeline   │◀─────────────────────────────┘
│ Podcast     │       │ Generation │
└─────────────┘       └────────────┘
```

## Storage Considerations

- **Database Storage**: The database stores metadata and references to audio files
- **File Storage**: Audio files are stored in the file system at `/podcasts/{podcastId}/segments/`
- **Timeline Data**: JSON timeline files are stored at `/podcasts/{podcastId}/merged_timeline.json`
- **Final Audio**: Merged podcast files are stored at `/podcasts/{podcastId}/{podcastId}_final.mp3`

## Performance Considerations

1. **Efficient Queries**:
   - Podcast segments can be retrieved with a single query using the `podcast_id` index
   - Audio versions can be filtered by `version_tag` for the latest versions

2. **Scalability**:
   - The segment-based architecture allows processing of podcasts of any length
   - Segments can be synthesized in parallel for better performance

3. **Storage Optimization**:
   - Only audio URLs are stored in the database, not binary data
   - File naming conventions include segment index and speaker name for clarity

## Future Enhancements

The current database design supports potential enhancements:

1. **Advanced Metadata**: Additional fields could be added to the `podcasts` table for categorization, language, etc.
2. **User Association**: A user_id field could link podcasts to specific users or accounts
3. **Publishing Status**: A status field could track podcast workflow (draft, processing, published)
4. **Playback Analytics**: A related table could store podcast engagement metrics
5. **Sharing/Permissions**: Additional tables could manage access control and sharing

## Comparison with Guide Audio System

The podcast database design differs from the guide audio system in several key ways:

1. **Content Structure**: 
   - Podcasts are composed of ordered segments from multiple speakers
   - Guide audios are single continuous narratives for a specific entity

2. **Association Model**:
   - Podcasts exist independently, not tied to museums/galleries/objects
   - Guide audios are directly linked to museum hierarchy entities

3. **Version Management**:
   - Podcast segments have separate audio versions (in segment_audios)
   - Guide audios use is_latest_version flag within the same table

This specialized design allows the podcast feature to handle conversational audio content efficiently while maintaining the system's overall architectural consistency.
