#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
高级双人播客自动对齐合成工具
这个脚本使用Pydub和音频处理技术自动对齐两个单声道音频，然后合成为立体声播客
"""

import os
import argparse
import numpy as np
import soundfile as sf
from scipy import signal
from pydub import AudioSegment
import tempfile
import wave

def convert_to_wav(audio_path, output_path=None):
    """将任意音频格式转换为WAV格式，便于处理"""
    if output_path is None:
        temp_dir = tempfile.gettempdir()
        output_path = os.path.join(temp_dir, os.path.basename(audio_path).split('.')[0] + '.wav')
    
    sound = AudioSegment.from_file(audio_path)
    sound.export(output_path, format="wav")
    return output_path

def read_audio_as_array(file_path):
    """将音频文件读取为numpy数组"""
    with wave.open(file_path, 'rb') as wf:
        # 获取音频参数
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        
        # 读取音频数据
        raw_data = wf.readframes(n_frames)
        
        # 将字节数据转换为numpy数组
        if sample_width == 1:  # 8-bit samples
            data = np.frombuffer(raw_data, dtype=np.uint8)
            data = data.astype(np.float32) / 128.0 - 1
        elif sample_width == 2:  # 16-bit samples
            data = np.frombuffer(raw_data, dtype=np.int16)
            data = data.astype(np.float32) / 32768.0
        elif sample_width == 4:  # 32-bit samples
            data = np.frombuffer(raw_data, dtype=np.int32)
            data = data.astype(np.float32) / 2147483648.0
        
        # 对于立体声，我们只使用第一个通道
        if channels == 2:
            data = data[::2]
    
    return data, framerate

def find_offset(audio1_array, audio2_array, sr1, sr2):
    """使用互相关来找到两个音频信号之间的偏移"""
    # 确保采样率相同
    if sr1 != sr2:
        print(f"警告：两个音频采样率不同 ({sr1} Hz vs {sr2} Hz)，可能影响对齐精度")
    
    # 计算互相关
    correlation = signal.correlate(audio1_array, audio2_array, mode='full')
    lags = signal.correlation_lags(len(audio1_array), len(audio2_array), mode='full')
    lag = lags[np.argmax(correlation)]
    
    # 将lag转换为秒
    offset_seconds = lag / sr1
    
    return offset_seconds

def align_and_merge(audio1_path, audio2_path, output_path, left_gain=0, right_gain=0):
    """
    自动对齐两个音频并合成为立体声播客
    audio1_path: 第一个音频文件路径（将放在左声道）
    audio2_path: 第二个音频文件路径（将放在右声道）
    output_path: 输出文件路径
    left_gain: 左声道增益(dB)
    right_gain: 右声道增益(dB)
    """
    print("开始处理音频文件...")
    
    # 转换为WAV格式
    print("转换音频格式为WAV...")
    wav1_path = convert_to_wav(audio1_path)
    wav2_path = convert_to_wav(audio2_path)
    
    # 读取为numpy数组
    print("读取音频数据...")
    audio1_array, sr1 = read_audio_as_array(wav1_path)
    audio2_array, sr2 = read_audio_as_array(wav2_path)
    
    # 找到偏移量
    print("计算音频对齐偏移量...")
    offset_seconds = find_offset(audio1_array, audio2_array, sr1, sr2)
    print(f"检测到的音频偏移量: {offset_seconds:.2f} 秒")
    
    # 使用pydub合并音频
    print("合并音频...")
    audio1 = AudioSegment.from_file(audio1_path)
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
    if offset_seconds > 0:
        # 如果audio1在audio2之前，添加静音到audio2的开头
        audio2 = AudioSegment.silent(duration=offset_seconds * 1000) + audio2
    elif offset_seconds < 0:
        # 如果audio2在audio1之前，添加静音到audio1的开头
        audio1 = AudioSegment.silent(duration=abs(offset_seconds) * 1000) + audio1
    
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
    
    # 清理临时文件
    if os.path.exists(wav1_path) and os.path.dirname(wav1_path) == tempfile.gettempdir():
        os.remove(wav1_path)
    if os.path.exists(wav2_path) and os.path.dirname(wav2_path) == tempfile.gettempdir():
        os.remove(wav2_path)
    
    print("合成完成!")

def main():
    parser = argparse.ArgumentParser(description='自动对齐并合成双人播客')
    parser.add_argument('audio1', help='第一个音频文件路径（将放在左声道）')
    parser.add_argument('audio2', help='第二个音频文件路径（将放在右声道）')
    parser.add_argument('output', help='输出文件路径')
    parser.add_argument('--left-gain', type=int, default=0, help='左声道增益(dB), 默认为0')
    parser.add_argument('--right-gain', type=int, default=0, help='右声道增益(dB), 默认为0')
    
    args = parser.parse_args()
    
    align_and_merge(args.audio1, args.audio2, args.output, args.left_gain, args.right_gain)

if __name__ == "__main__":
    main() 