// 简单的测试脚本来验证synthesis task系统
async function testSynthesisTask() {
  console.log('Testing synthesis task system...');
  
  try {
    // 1. 测试创建任务
    console.log('1. Testing task creation...');
    const createResponse = await fetch('http://localhost:3000/api/podcast/process/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        podcastId: 'test-podcast-' + Date.now(),
        segments: [
          {
            text: 'Hello, this is a test segment.',
            speakerPersonaId: 1,
            segmentIndex: 0
          },
          {
            text: 'This is another test segment.',
            speakerPersonaId: 2,
            segmentIndex: 1
          }
        ],
        async: true
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create task: ${createResponse.statusText}`);
    }

    const createResult = await createResponse.json();
    console.log('Create task result:', createResult);

    if (!createResult.taskId) {
      throw new Error('No task ID returned');
    }

    // 2. 测试任务状态检查
    console.log('2. Testing task status check...');
    const statusResponse = await fetch(`http://localhost:3000/api/podcast/synthesis-status/${createResult.taskId}`);
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to check status: ${statusResponse.statusText}`);
    }

    const statusResult = await statusResponse.json();
    console.log('Task status result:', statusResult);

    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// 如果直接运行这个文件就执行测试
if (typeof process !== 'undefined' && process.argv[1].includes('test-synthesis-task')) {
  testSynthesisTask();
}

module.exports = { testSynthesisTask }; 