import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { sendStream } from 'h3';
import { createReadStream } from 'fs';

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getRouterParam(event, 'sessionId');
    const fileName = getRouterParam(event, 'fileName');
    
    if (!sessionId || !fileName) {
      return createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required parameters' 
      });
    }
    
    // 构建文件路径
    const filePath = path.join(process.cwd(), 'podcast_outputs', sessionId, fileName);
    
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return createError({ 
        statusCode: 404, 
        statusMessage: 'File not found' 
      });
    }
    
    // 根据文件类型设置响应头
    const isJson = fileName.endsWith('.json');
    const contentType = isJson ? 'application/json' : 'audio/mpeg';
    
    // 设置响应头
    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${fileName}"`
    });
    
    // 对于JSON文件，直接读取并返回
    if (isJson) {
      const fileContent = readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    }
    
    // 对于音频文件，使用流式传输
    const stream = createReadStream(filePath);
    return sendStream(event, stream);
  } catch (error) {
    console.error('Error serving file:', error);
    return createError({ 
      statusCode: 500, 
      statusMessage: `Internal server error: ${error.message}` 
    });
  }
}); 