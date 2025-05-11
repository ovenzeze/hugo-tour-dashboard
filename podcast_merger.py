#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
双人播客合成工具
这个脚本使用Pydub库将两个单声道音频合成为一个双声道播客
将一个声音放在左声道，另一个声音放在右声道
"""

import os
import argparse
from pydub import AudioSegment

def create_stereo_podcast(audio1_path, audio2_path, output_path, left_gain=0, right_gain=0):
    """
    将两个单声道音频合成为一个双声道播客
    audio1_path: 第一个音频文件路径（将放在左声道）
    audio2_path: 第二个音频文件路径（将放在右声道）
    output_path: 输出文件路径
    left_gain: 左声道增益(dB)
    right_gain: 右声道增益(dB)
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
    
    # 确定最长的音频时长
    max_length = max(len(audio1), len(audio2))
    
    # 如果音频长度不同，用静音填充较短的音频
    if len(audio1) < max_length:
        audio1 = audio1 + AudioSegment.silent(duration=max_length - len(audio1))
    if len(audio2) < max_length:
        audio2 = audio2 + AudioSegment.silent(duration=max_length - len(audio2))
    
    # 创建左右声道
    left_channel = audio1.pan(-1)  # 全部放在左声道
    right_channel = audio2.pan(1)  # 全部放在右声道
    
    # 合并为立体声
    stereo_sound = left_channel.overlay(right_channel)
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    print(f"正在导出立体声播客到: {output_path}")
    stereo_sound.export(output_path, format="mp3")
    print("合成完成!")

def main():
    parser = argparse.ArgumentParser(description='将两个单声道音频合成为一个双声道播客')
    parser.add_argument('audio1', help='第一个音频文件路径（将放在左声道）')
    parser.add_argument('audio2', help='第二个音频文件路径（将放在右声道）')
    parser.add_argument('output', help='输出文件路径')
    parser.add_argument('--left-gain', type=int, default=0, help='左声道增益(dB), 默认为0')
    parser.add_argument('--right-gain', type=int, default=0, help='右声道增益(dB), 默认为0')
    
    args = parser.parse_args()
    
    create_stereo_podcast(args.audio1, args.audio2, args.output, args.left_gain, args.right_gain)

if __name__ == "__main__":
    main() 