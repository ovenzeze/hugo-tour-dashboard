#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
手动偏移量双人播客合成工具
这个脚本使用Pydub库将两个单声道音频合成为一个双声道播客
用户可以手动指定两个音频之间的偏移量以达到最佳效果
"""

import os
import argparse
from pydub import AudioSegment

def create_stereo_podcast(audio1_path, audio2_path, output_path, offset_ms=0, left_gain=0, right_gain=0, 
                         pan_left=1.0, pan_right=1.0):
    """
    将两个单声道音频合成为一个双声道播客，使用手动指定的偏移量
    audio1_path: 第一个音频文件路径（将放在左声道）
    audio2_path: 第二个音频文件路径（将放在右声道）
    output_path: 输出文件路径
    offset_ms: 手动指定的偏移量(毫秒)，正值表示audio2延迟，负值表示audio1延迟
    left_gain: 左声道增益(dB)
    right_gain: 右声道增益(dB)
    pan_left: 左声道的混合程度 (0.0-1.0)
    pan_right: 右声道的混合程度 (0.0-1.0)
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
    
    # 根据偏移量对齐音频
    print(f"应用手动偏移量: {offset_ms} 毫秒")
    if offset_ms > 0:
        # 如果偏移量为正，则audio2延迟
        audio2 = AudioSegment.silent(duration=offset_ms) + audio2
    elif offset_ms < 0:
        # 如果偏移量为负，则audio1延迟
        audio1 = AudioSegment.silent(duration=abs(offset_ms)) + audio1
    
    # 确定最长的音频时长
    max_length = max(len(audio1), len(audio2))
    
    # 如果音频长度不同，用静音填充较短的音频
    if len(audio1) < max_length:
        audio1 = audio1 + AudioSegment.silent(duration=max_length - len(audio1))
    if len(audio2) < max_length:
        audio2 = audio2 + AudioSegment.silent(duration=max_length - len(audio2))
    
    # 创建左右声道
    if pan_left == 1.0:
        left_channel = audio1.pan(-1)  # 全部放在左声道
    else:
        left_channel = audio1.pan(-pan_left)  # 部分放在左声道
    
    if pan_right == 1.0:
        right_channel = audio2.pan(1)  # 全部放在右声道
    else:
        right_channel = audio2.pan(pan_right)  # 部分放在右声道
    
    # 合并为立体声
    stereo_sound = left_channel.overlay(right_channel)
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    print(f"正在导出立体声播客到: {output_path}")
    stereo_sound.export(output_path, format="mp3")
    print("合成完成!")

def main():
    parser = argparse.ArgumentParser(description='手动对齐并合成双人播客')
    parser.add_argument('audio1', help='第一个音频文件路径（将放在左声道）')
    parser.add_argument('audio2', help='第二个音频文件路径（将放在右声道）')
    parser.add_argument('output', help='输出文件路径')
    parser.add_argument('--offset', type=int, default=0, 
                        help='手动指定的偏移量(毫秒)，正值表示第二个音频延迟，负值表示第一个音频延迟')
    parser.add_argument('--left-gain', type=int, default=0, help='左声道增益(dB), 默认为0')
    parser.add_argument('--right-gain', type=int, default=0, help='右声道增益(dB), 默认为0')
    parser.add_argument('--pan-left', type=float, default=1.0, 
                        help='左声道的混合程度 (0.0-1.0)，值越小越居中，默认为1.0完全在左')
    parser.add_argument('--pan-right', type=float, default=1.0, 
                        help='右声道的混合程度 (0.0-1.0)，值越小越居中，默认为1.0完全在右')
    
    args = parser.parse_args()
    
    create_stereo_podcast(args.audio1, args.audio2, args.output, args.offset, 
                         args.left_gain, args.right_gain, args.pan_left, args.pan_right)

if __name__ == "__main__":
    main() 