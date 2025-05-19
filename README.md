# 火山引擎语音合成API测试Demo

这是一个测试火山引擎语音合成API的示例程序，包含时间戳功能。

## 功能特点

- 调用火山引擎语音合成API生成语音
- 支持时间戳功能，可以获取每个字的发音时间
- 保存生成的音频文件和时间戳信息
- 详细的日志输出，包括请求和响应的详细信息

## 环境要求

- Python 3.6 或更高版本
- 安装依赖：`pip install requests python-dotenv`

## 使用方法

1. 配置.env文件

在项目根目录下创建一个名为`.env`的文件，并添加以下内容：

```
# 必需的环境变量
VOLCENGINE_APPID=你的AppID
VOLCENGINE_ACCESS_TOKEN=你的Access Token
VOLCENGINE_CLUSTER=你的Cluster

# 可选的环境变量
VOLCENGINE_VOICE_TYPE=zh_female_qingxin  # 可选，默认使用"zh_female_qingxin"
```

注意：已经为您创建了包含示例凭证的.env文件，您可以直接使用或根据需要修改。

2. 运行脚本

```bash
python volcengine_tts_demo.py
```

3. 查看结果

脚本会生成两个音频文件：
- `output_with_timestamps.mp3`：带时间戳的音频文件
- `output_without_timestamps.mp3`：不带时间戳的音频文件

同时，如果成功获取到时间戳信息，会生成一个JSON文件：
- `output_with_timestamps.mp3.timestamps.json`：包含时间戳信息的JSON文件

## 时间戳格式说明

时间戳信息通常包含以下内容：
- 每个字的开始时间和结束时间
- 时间单位通常为毫秒

示例：
```json
{
  "timestamps": [
    {
      "text": "这",
      "start_time": 0,
      "end_time": 250
    },
    {
      "text": "是",
      "start_time": 250,
      "end_time": 500
    },
    ...
  ]
}
```

## 注意事项

- 请确保已经在火山引擎平台申请了语音合成服务的访问权限
- 请妥善保管你的API凭证，不要将其提交到代码仓库中
- 时间戳功能可能需要特定的API权限，请确认你的账号是否有权限使用此功能

## 参考文档

- [火山引擎语音合成API文档](https://www.volcengine.com/docs/6561/79820)
