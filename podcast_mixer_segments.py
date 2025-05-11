#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
双人对话播客合成工具
这个脚本使用Pydub库将两个单声道音频按照预定义的时间段交替排列
创造一个真实的对话效果，而不是简单地将两个完整音轨放在左右声道
支持使用ElevenLabs API返回的时间戳信息进行精确分段
"""

import os
import argparse
import json
from pydub import AudioSegment

def create_dialog_podcast(audio1_path, audio2_path, output_path, segments_file=None, 
                          left_gain=0, right_gain=0):
    """
    将两个单声道音频按照预定义的时间段交替排列，创建对话效果
    audio1_path: 第一个人的音频文件路径
    audio2_path: 第二个人的音频文件路径
    output_path: 输出文件路径
    segments_file: 包含片段信息的JSON文件，格式为:
                  [
                    {"speaker": 1, "start": 0, "end": 10000},
                    {"speaker": 2, "start": 0, "end": 8000},
                    {"speaker": 1, "start": 12000, "end": 20000}
                    ...
                  ]
                  其中start和end是毫秒单位
    left_gain: 第一个人的音量增益(dB)
    right_gain: 第二个人的音量增益(dB)
    """
    print(f"正在读取第一个音频文件: {audio1_path}")
    audio1 = AudioSegment.from_file(audio1_path)
    
    print(f"正在读取第二个音频文件: {audio2_path}")
    audio2 = AudioSegment.from_file(audio2_path)
    
    # 确保两个音频都是单声道
    if audio1.channels > 1:
        audio1 = audio1.set_channels(1)
    if audio2.channels > 1:
        audio2 = audio2.set_channels(1)
    
    # 调整音量
    if left_gain != 0:
        audio1 = audio1 + left_gain
    if right_gain != 0:
        audio2 = audio2 + right_gain
    
    # 如果没有提供片段文件，我们可以简单地交替使用固定时长的片段
    if segments_file is None:
        # 默认每个片段10秒
        segments = generate_default_segments(len(audio1), len(audio2))
    else:
        # 从JSON文件加载片段信息
        with open(segments_file, 'r') as f:
            segments = json.load(f)
    
    # 合成最终的播客
    final_podcast = AudioSegment.silent(duration=0)
    
    for segment in segments:
        speaker = segment["speaker"]
        start = segment["start"]
        end = segment["end"]
        
        if speaker == 1:
            # 确保时间范围有效
            end = min(end, len(audio1))
            if start < end:
                segment_audio = audio1[start:end]
                final_podcast = final_podcast + segment_audio
                print(f"添加 音频1 片段: {start}ms - {end}ms")
        elif speaker == 2:
            # 确保时间范围有效
            end = min(end, len(audio2))
            if start < end:
                segment_audio = audio2[start:end]
                final_podcast = final_podcast + segment_audio
                print(f"添加 音频2 片段: {start}ms - {end}ms")
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    # 导出最终的播客
    print(f"正在导出播客到: {output_path}")
    final_podcast.export(output_path, format="mp3")
    print("合成完成!")

def parse_elevenlabs_timestamps(elevenlabs_json1, elevenlabs_json2, min_segment_duration_ms=500):
    """
    从ElevenLabs API的时间戳JSON数据解析分段信息
    
    elevenlabs_json1: 第一个音频的ElevenLabs时间戳JSON数据文件路径
    elevenlabs_json2: 第二个音频的ElevenLabs时间戳JSON数据文件路径
    min_segment_duration_ms: 最小分段时长(毫秒)，低于这个值的分段会被忽略
    
    返回: 分段信息列表，可用于create_dialog_podcast函数
    """
    # 加载ElevenLabs时间戳数据
    with open(elevenlabs_json1, 'r') as f:
        data1 = json.load(f)
    
    with open(elevenlabs_json2, 'r') as f:
        data2 = json.load(f)
    
    segments = []
    
    # 提取第一个音频的单词级别时间戳
    if 'words' in data1:
        for word in data1.get('words', []):
            start_time_ms = int(word.get('start', 0) * 1000)
            end_time_ms = int(word.get('end', 0) * 1000)
            
            # 忽略过短的分段
            if end_time_ms - start_time_ms < min_segment_duration_ms:
                continue
                
            segments.append({
                "speaker": 1,
                "start": start_time_ms,
                "end": end_time_ms
            })
    
    # 提取第二个音频的单词级别时间戳
    if 'words' in data2:
        for word in data2.get('words', []):
            start_time_ms = int(word.get('start', 0) * 1000)
            end_time_ms = int(word.get('end', 0) * 1000)
            
            # 忽略过短的分段
            if end_time_ms - start_time_ms < min_segment_duration_ms:
                continue
                
            segments.append({
                "speaker": 2,
                "start": start_time_ms,
                "end": end_time_ms
            })
    
    # 按照开始时间排序
    segments.sort(key=lambda x: x["start"])
    
    return segments

def generate_segments_from_timestamps(audio1_path, audio2_path, output_file, elevenlabs_json1=None, elevenlabs_json2=None, min_segment_duration_ms=500):
    """
    根据ElevenLabs时间戳创建分段模板文件
    """
    if elevenlabs_json1 and elevenlabs_json2:
        segments = parse_elevenlabs_timestamps(elevenlabs_json1, elevenlabs_json2, min_segment_duration_ms)
    else:
        # 如果没有提供时间戳文件，则生成默认分段
        audio1 = AudioSegment.from_file(audio1_path)
        audio2 = AudioSegment.from_file(audio2_path)
        segments = generate_default_segments(len(audio1), len(audio2))
    
    with open(output_file, 'w') as f:
        json.dump(segments, f, indent=2)
    
    print(f"已创建分段模板文件: {output_file}")
    print("您可以编辑该文件以自定义分段，然后用它来合成播客")

def generate_default_segments(audio1_length, audio2_length, segment_duration=10000):
    """
    生成默认的片段设置，每个人说话10秒钟（10000毫秒）
    """
    segments = []
    current_time1 = 0
    current_time2 = 0
    
    # 交替添加片段，直到两个音频都用完
    while current_time1 < audio1_length or current_time2 < audio2_length:
        # 添加第一个人的片段
        if current_time1 < audio1_length:
            end_time = min(current_time1 + segment_duration, audio1_length)
            segments.append({
                "speaker": 1,
                "start": current_time1,
                "end": end_time
            })
            current_time1 = end_time
        
        # 添加第二个人的片段
        if current_time2 < audio2_length:
            end_time = min(current_time2 + segment_duration, audio2_length)
            segments.append({
                "speaker": 2,
                "start": current_time2,
                "end": end_time
            })
            current_time2 = end_time
    
    return segments

def create_segments_template(audio1_path, audio2_path, output_file, segment_duration=10000):
    """
    创建一个片段模板文件，用户可以编辑该文件来自定义片段
    """
    audio1 = AudioSegment.from_file(audio1_path)
    audio2 = AudioSegment.from_file(audio2_path)
    
    segments = generate_default_segments(len(audio1), len(audio2), segment_duration)
    
    with open(output_file, 'w') as f:
        json.dump(segments, f, indent=2)
    
    print(f"已创建片段模板文件: {output_file}")
    print("您可以编辑该文件以自定义片段，然后用它来合成播客")

def main():
    parser = argparse.ArgumentParser(description='创建交替对话的播客')
    subparsers = parser.add_subparsers(dest='command', help='子命令')
    
    # 创建片段模板的命令
    template_parser = subparsers.add_parser('create-template', help='创建片段模板文件')
    template_parser.add_argument('audio1', help='第一个音频文件路径')
    template_parser.add_argument('audio2', help='第二个音频文件路径')
    template_parser.add_argument('output', help='输出的片段模板文件路径')
    template_parser.add_argument('--segment-duration', type=int, default=10000, 
                               help='默认片段时长(毫秒), 默认为10000(10秒)')
    template_parser.add_argument('--elevenlabs-json1', help='第一个音频的ElevenLabs时间戳JSON文件')
    template_parser.add_argument('--elevenlabs-json2', help='第二个音频的ElevenLabs时间戳JSON文件')
    template_parser.add_argument('--min-segment-duration', type=int, default=500, 
                               help='最小分段时长(毫秒), 默认为500毫秒')
    
    # 合成播客的命令
    mix_parser = subparsers.add_parser('mix', help='合成播客')
    mix_parser.add_argument('audio1', help='第一个音频文件路径')
    mix_parser.add_argument('audio2', help='第二个音频文件路径')
    mix_parser.add_argument('output', help='输出的播客文件路径')
    mix_parser.add_argument('--segments', help='包含片段信息的JSON文件路径')
    mix_parser.add_argument('--left-gain', type=int, default=0, help='第一个人的音量增益(dB)')
    mix_parser.add_argument('--right-gain', type=int, default=0, help='第二个人的音量增益(dB)')
    
    args = parser.parse_args()
    
    if args.command == 'create-template':
        if args.elevenlabs_json1 and args.elevenlabs_json2:
            generate_segments_from_timestamps(
                args.audio1, args.audio2, args.output, 
                args.elevenlabs_json1, args.elevenlabs_json2, 
                args.min_segment_duration
            )
        else:
            create_segments_template(args.audio1, args.audio2, args.output, args.segment_duration)
    elif args.command == 'mix':
        create_dialog_podcast(args.audio1, args.audio2, args.output, args.segments, 
                             args.left_gain, args.right_gain)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 