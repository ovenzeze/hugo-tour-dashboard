// @ts-ignore
import { ElevenLabsClient } from 'elevenlabs'

// ElevenLabs API返回类型
interface ElevenLabsTimestampResponse {
  audio: string; // Base64编码的音频
  timestamps: {
    char: string; // 字符
    start: number; // 开始时间(秒)
    end: number;   // 结束时间(秒)
  }[];
}

// 类型断言函数
function isTimestampResponse(obj: any): obj is ElevenLabsTimestampResponse {
  return obj && 
         typeof obj.audio === 'string' && 
         Array.isArray(obj.timestamps)
}

// 初始化客户端
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
})

// 测试文本
const testText = "这是一个测试文本，用于验证时间戳API功能。"

async function testTimingAPI() {
  try {
    console.log("开始测试ElevenLabs timing API...")
    
    // 调用带时间戳的API
    const params = {
      voiceId: 'JBFqnCBsd6RMkjVDRZzb', // 示例voiceId
      modelId: 'eleven_multilingual_v2',
      optimizeStreamingLatency: 3,
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75
      },
      outputFormat: 'mp3_44100_128'
    } as any
    
    const result = await elevenlabs.textToSpeech.convertWithTimestamps(
      testText, // 文本内容
      params
    )

    console.log("\nAPI调用成功！结果分析：")
    // 类型检查
    if (!isTimestampResponse(result)) {
      throw new Error('Invalid API response format')
    }

    console.log(`音频长度: ${result.audio.length} bytes`)
    console.log(`时间戳数量: ${result.timestamps.length}`)
    
    // 打印前5个时间戳示例
    console.log("\n前5个字符时间戳：")
    result.timestamps.slice(0, 5).forEach(ts => {
      console.log(`字符: "${ts.char}" | 开始: ${ts.start.toFixed(2)}s | 结束: ${ts.end.toFixed(2)}s`)
    })

    // 验证时间戳顺序
    const isOrdered = result.timestamps.every((ts, i, arr) => 
      i === 0 || ts.start >= arr[i-1].end
    )
    console.log(`\n时间戳顺序验证: ${isOrdered ? '通过' : '失败'}`)

  } catch (error) {
    console.error("测试失败:", error)
  }
}

testTimingAPI()
