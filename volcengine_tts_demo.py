#!/usr/bin/env python
# coding=utf-8

'''
火山引擎语音合成API测试Demo
包含时间戳功能
'''
import base64
import json
import uuid
import requests
import os
import time
import sys
import hmac
import hashlib
from datetime import datetime
from dotenv import load_dotenv

# 加载.env文件中的环境变量
load_dotenv()

# 填写平台申请的appid, access_token以及cluster
# 这些信息需要从环境变量中获取
appid = os.environ.get("VOLCENGINE_APPID", "")
access_token = os.environ.get("VOLCENGINE_ACCESS_TOKEN", "")
secret_key = os.environ.get("VOLCENGINE_SECRET_KEY", "")
cluster = os.environ.get("VOLCENGINE_CLUSTER", "")
voice_type = os.environ.get("VOLCENGINE_VOICE_TYPE", "BV001_streaming")  # 默认使用通用女声
instance_id = "Speech_Synthesis7506120092859191552"  # 用户提供的实例ID

# 可用的音色列表
VOICE_TYPES = {
    "female": "BV001_streaming",  # 通用女声
    "male": "BV002_streaming"     # 通用男声
}

if not appid or not access_token or not secret_key or not cluster:
    print("请设置环境变量: VOLCENGINE_APPID, VOLCENGINE_ACCESS_TOKEN, VOLCENGINE_SECRET_KEY, VOLCENGINE_CLUSTER")
    print("可选设置环境变量: VOLCENGINE_VOICE_TYPE")
    exit(1)

print(f"使用的凭证信息:")
print(f"AppID: {appid}")
print(f"Access Token: {access_token[:5]}...{access_token[-5:]}")
print(f"Secret Key: {secret_key[:5]}...{secret_key[-5:]}")
print(f"Cluster: {cluster}")
print(f"Voice Type: {voice_type if voice_type else '默认'}")

# 火山引擎API地址
host = "openspeech.bytedance.com"
api_url = f"https://{host}/api/v1/tts"

# 设置请求头 - 根据文档，认证方式采用Bearer Token，需要在请求的Header中填入"Authorization":"Bearer;${token}"
header = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer;{access_token}"
}

def generate_speech(text, output_file="output.mp3", enable_timestamps=True):
    """
    生成语音并保存到文件
    
    参数:
    text: 要转换为语音的文本
    output_file: 输出的音频文件名
    enable_timestamps: 是否启用时间戳功能
    
    返回:
    timestamps: 如果启用了时间戳功能，返回时间戳信息；否则返回None
    """
    print(f"准备生成语音，文本: '{text}'")
    print(f"输出文件: {output_file}")
    print(f"是否启用时间戳: {enable_timestamps}")
    print(f"使用的凭证: AppID={appid}, Cluster={cluster}")
    
    # 构建请求JSON
    request_json = {
        "app": {
            "appid": appid,
            "token": access_token,
            "cluster": cluster,
            "instance_id": instance_id  # 添加实例ID
        },
        "user": {
            "uid": str(uuid.uuid4())
        },
        "audio": {
            "voice_type": voice_type,  # 使用环境变量中设置的音色或默认的BV001_streaming
            "encoding": "mp3",
            "speed_ratio": 1.0,
            "volume_ratio": 1.0,
            "pitch_ratio": 1.0,
        },
        "request": {
            "reqid": str(uuid.uuid4()),
            "text": text,
            "text_type": "plain",
            "operation": "query",
            "with_frontend": 1,
            "frontend_type": "unitTson"
        }
    }
    
    # 添加时间戳请求参数
    if enable_timestamps:
        # 根据火山引擎API文档，添加时间戳相关参数
        # 注意：这里的参数名可能需要根据实际API文档调整
        request_json["request"]["need_timestamps"] = 1
    
    print(f"发送请求: {json.dumps(request_json, ensure_ascii=False, indent=2)}")
    print(f"请求头: {header}")
    
    try:
        # 发送请求
        start_time = time.time()
        resp = requests.post(api_url, json.dumps(request_json), headers=header)
        end_time = time.time()
        
        print(f"请求耗时: {end_time - start_time:.2f}秒")
        print(f"响应状态码: {resp.status_code}")
        
        # 检查响应状态码
        if resp.status_code != 200:
            print(f"请求失败，状态码: {resp.status_code}")
            print(f"响应内容: {resp.text}")
            return None
        
        # 解析响应
        try:
            response_json = resp.json()
            print(f"响应内容: \n{json.dumps(response_json, ensure_ascii=False, indent=2)}")
        except json.JSONDecodeError:
            print(f"响应不是有效的JSON格式: {resp.text}")
            return None
        
        # 检查错误码
        if "code" in response_json and response_json["code"] != 0:
            print(f"API返回错误: {response_json.get('message', '未知错误')}")
            return None
        
        # 提取音频数据
        if "data" in response_json:
            data = response_json["data"]
            try:
                with open(output_file, "wb") as file:
                    file.write(base64.b64decode(data))
                print(f"音频已保存到: {output_file}")
            except Exception as e:
                print(f"保存音频文件时出错: {str(e)}")
        else:
            print("响应中没有音频数据")
        
        # 提取时间戳信息
        timestamps = None
        if enable_timestamps:
            # 尝试从不同可能的字段中获取时间戳信息
            for field in ["timestamps", "timestamp", "time_stamps", "time_stamp"]:
                if field in response_json:
                    timestamps = response_json[field]
                    print(f"从字段 '{field}' 中找到时间戳信息")
                    break
            
            if timestamps:
                # 保存时间戳信息到JSON文件
                timestamp_file = f"{output_file}.timestamps.json"
                with open(timestamp_file, "w", encoding="utf-8") as file:
                    json.dump(timestamps, file, ensure_ascii=False, indent=2)
                print(f"时间戳信息已保存到: {timestamp_file}")
            else:
                print("响应中没有找到时间戳信息")
        
        return timestamps
    
    except requests.exceptions.RequestException as e:
        print(f"请求异常: {str(e)}")
        return None
    except Exception as e:
        print(f"发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """主函数"""
    import argparse
    
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="火山引擎语音合成API测试Demo (带时间戳功能)")
    parser.add_argument("--text", type=str, 
                        default="这是一个测试语音合成API的示例。我们将测试时间戳功能，看看每个字的发音时间。",
                        help="要合成的文本")
    parser.add_argument("--voice", type=str, choices=["female", "male"], default="female",
                        help="选择音色: female(通用女声) 或 male(通用男声)")
    parser.add_argument("--output", type=str, default="output.mp3",
                        help="输出的音频文件名")
    parser.add_argument("--no-timestamps", action="store_true",
                        help="禁用时间戳功能")
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 根据命令行参数设置音色
    global voice_type
    if args.voice in VOICE_TYPES:
        voice_type = VOICE_TYPES[args.voice]
        print(f"使用音色: {args.voice} ({voice_type})")
    
    print("火山引擎语音合成API测试Demo (带时间戳功能)")
    print("=" * 50)
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"AppID: {appid}")
    print(f"Cluster: {cluster}")
    print(f"Voice Type: {voice_type}")
    print(f"实例ID: {instance_id}")
    print("=" * 50)
    
    # 生成语音
    enable_timestamps = not args.no_timestamps
    output_file = args.output
    
    print(f"\n生成{'带' if enable_timestamps else '不带'}时间戳的语音:")
    timestamps = generate_speech(args.text, output_file, enable_timestamps)
    
    if timestamps:
        print("\n时间戳信息:")
        print(json.dumps(timestamps, ensure_ascii=False, indent=2))
    
    print("\n测试完成!")

if __name__ == "__main__":
    main()
