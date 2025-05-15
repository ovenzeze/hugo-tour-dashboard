import { defineEventHandler, getQuery, createError } from 'h3';
import { getStorageService } from '../../services/storageService';
import type { IStorageService } from '../../services/storageService';
import fs from 'fs';
import path from 'path';

interface SegmentStatus {
  id: string | number;
  text: string;
  speakerName: string;
  voiceId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  audioUrl?: string;
  timestampUrl?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const podcastId = query.podcastId as string;
    
    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required query parameter: podcastId',
      });
    }
    
    const storageService: IStorageService = await getStorageService(event);
    
    // Check if timeline JSON exists
    const timelineStoragePath = storageService.joinPath('public', 'podcasts', podcastId, 'merged_timeline.json');
    const timelineExists = await storageService.exists(timelineStoragePath);
    
    // If timeline doesn't exist, we can't get segment status
    if (!timelineExists) {
      return {
        success: false,
        message: 'Timeline not found. Generate timeline first.',
        segments: []
      };
    }
    
    // Read timeline content
    const timelineContent = await storageService.readFile(timelineStoragePath, 'utf-8') as string;
    const timelineData = JSON.parse(timelineContent);
    
    if (!Array.isArray(timelineData) || timelineData.length === 0) {
      return {
        success: true,
        message: 'Timeline exists but contains no segments.',
        segments: []
      };
    }
    
    // Get segments directory
    const segmentsDirPath = storageService.joinPath('public', 'podcasts', podcastId, 'segments');
    const segmentsDirExists = await storageService.exists(segmentsDirPath);
    
    if (!segmentsDirExists) {
      // Timeline exists but segments directory doesn't - unusual situation
      return {
        success: true,
        message: 'Timeline exists but segments directory not found.',
        segments: timelineData.map((segment, index) => ({
          id: index,
          text: '...',
          speakerName: segment.speaker,
          status: 'pending'
        }))
      };
    }
    
    // Get list of files in segments directory
    let segmentFiles: string[] = [];
    try {
      // Using Node.js fs API since storageService might not have a listDir method
      // In a real project, preferably use storageService methods
      const publicPath = storageService.resolvePath(segmentsDirPath);
      if (fs.existsSync(publicPath)) {
        segmentFiles = fs.readdirSync(publicPath);
      }
    } catch (error) {
      console.error('Error listing segment files:', error);
    }
    
    // Build segments status list
    const segments: SegmentStatus[] = timelineData.map((segment: any, index: number) => {
      // Extract basic info from timeline
      const baseInfo = {
        id: index,
        text: segment.text || '...',
        speakerName: segment.speaker,
        audioUrl: segment.audioFile ? storageService.getPublicUrl(segment.audioFile) : undefined,
        timestampUrl: segment.timestampFile ? storageService.getPublicUrl(segment.timestampFile) : undefined
      };
      
      // Determine status based on file existence
      const audioFileFound = segmentFiles.some(file => 
        file.includes(`${String(index).padStart(3, '0')}_`) && file.endsWith('.mp3')
      );
      const timestampFileFound = segmentFiles.some(file => 
        file.includes(`${String(index).padStart(3, '0')}_`) && file.endsWith('.json')
      );
      
      let status: 'pending' | 'processing' | 'success' | 'failed' = 'pending';
      
      if (audioFileFound && timestampFileFound) {
        status = 'success';
      } else if (audioFileFound || timestampFileFound) {
        // Only one type of file exists - may be in progress or failed
        status = 'failed';
      }
      
      return {
        ...baseInfo,
        status
      };
    });
    
    return {
      success: true,
      podcastId,
      segments,
      message: `Retrieved ${segments.length} segment statuses for podcast ${podcastId}.`
    };
    
  } catch (error: any) {
    console.error(`Error in /api/podcast/segments-status:`, error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to get segment statuses: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
}); 