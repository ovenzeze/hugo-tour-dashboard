// 测试脚本分析API
const testScriptContent = `Welcome to today's tech podcast! Today we're discussing the latest developments in artificial intelligence.
Thank you for having me! I'm Dr. Zhang, an AI researcher from Tsinghua University.
Dr. Zhang, could you tell us about the most exciting breakthroughs in AI today?
Certainly! In recent years, the development of large language models has been truly amazing. From GPT to ChatGPT, we've seen tremendous progress in AI's ability to understand and generate natural language.
That's really interesting! What impact do you think AI technology will have on our daily lives?
I believe AI will fundamentally change how we work, learn, and even create. For example, we already have AI that can help write code, design images, and even create music.`;

async function testAnalyzeScript() {
  try {
    const response = await fetch('http://localhost:3001/api/ai/analyze-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scriptContent: testScriptContent
      })
    });

    const result = await response.json();
    console.log('分析结果:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log('\n=== 分析摘要 ===');
      console.log('语言:', result.data.language, '(' + result.data.detectedLanguageName + ')');
      console.log('说话者数量:', result.data.speakers.length);
      result.data.speakers.forEach((speaker, index) => {
        console.log(`  ${index + 1}. ${speaker.name} (${speaker.role}) - ${speaker.segments} 段话`);
      });
      console.log('建议标题:', result.data.metadata.suggestedTitle);
      console.log('建议主题:', result.data.metadata.suggestedTopic);
      console.log('脚本类型:', result.data.metadata.scriptType);
      console.log('预估时长:', result.data.metadata.estimatedDuration);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testAnalyzeScript(); 