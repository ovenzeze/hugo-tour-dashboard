#!/usr/bin/env python3
import re
import csv
import os
from datetime import datetime

def extract_persona_data(log_file_path):
    """
    从日志文件中提取 Persona 数据
    """
    personas = []
    
    try:
        with open(log_file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # 使用更宽松的分割方式
        lines = content.split('\n')
        current_persona = {}
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # 查找处理persona的行
            persona_match = re.search(r'Processing Persona ID:\s*(\d+),\s*Name:\s*(.+)', line)
            if persona_match:
                # 保存上一个persona（如果存在）
                if current_persona:
                    personas.append(current_persona.copy())
                
                # 开始新的persona
                current_persona = {
                    'id': persona_match.group(1),
                    'name': persona_match.group(2).strip(),
                    'description': '',
                    'avatar_url': '',
                    'timestamp': '',
                    'status': 'processing'
                }
                continue
            
            # 如果没有当前persona，跳过
            if not current_persona:
                continue
            
            # 查找时间戳
            if not current_persona['timestamp']:
                time_match = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)', line)
                if time_match:
                    current_persona['timestamp'] = time_match.group(1)
            
            # 查找生成图片的prompt（包含描述）
            if 'Generating image with prompt:' in line:
                # 获取完整的prompt，可能跨越多行
                full_prompt = line
                j = i + 1
                while j < len(lines) and not re.search(r'Generated image URL:|ERROR:', lines[j]):
                    full_prompt += " " + lines[j].strip()
                    j += 1
                
                # 从prompt中提取描述
                # 新格式: "A highly realistic and natural portrait of 名称, a modern and friendly tour guide. 描述. The portrait..."
                desc_match = re.search(r'"[^"]*guide\.\s*([^.]*?)\.\s*The portrait', full_prompt)
                if desc_match:
                    current_persona['description'] = desc_match.group(1).strip()
                else:
                    # 备选格式：老格式 "anthropomorphic guide, 名称, 描述, studio portrait..."
                    old_format_match = re.search(r'"anthropomorphic guide,\s*[^,]*,\s*([^,]*?)(?:,|\.\s)', full_prompt)
                    if old_format_match:
                        current_persona['description'] = old_format_match.group(1).strip()
            
            # 查找生成的图片URL
            url_match = re.search(r'Generated image URL:\s*(https://[^\s]+)', line)
            if url_match:
                current_persona['avatar_url'] = url_match.group(1)
            
            # 查找成功更新状态
            if 'Successfully updated avatar for persona_id:' in line:
                current_persona['status'] = 'updated'
        
        # 添加最后一个persona
        if current_persona:
            personas.append(current_persona)
        
        # 去重 - 保留最新的记录
        unique_personas = {}
        for persona in personas:
            persona_id = persona['id']
            if persona_id not in unique_personas or (persona['timestamp'] and persona['timestamp'] > unique_personas[persona_id].get('timestamp', '')):
                unique_personas[persona_id] = persona
        
        return list(unique_personas.values())
    
    except FileNotFoundError:
        print(f"Error: Log file not found: {log_file_path}")
        return []
    except Exception as e:
        print(f"Error reading log file: {e}")
        return []

def save_to_csv(personas, output_file):
    """
    将 Persona 数据保存为 CSV 文件
    """
    if not personas:
        print("No persona data found to save.")
        return
    
    # 定义字段顺序
    fieldnames = ['id', 'name', 'description', 'avatar_url', 'timestamp', 'status']
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            # 按ID排序
            sorted_personas = sorted(personas, key=lambda x: int(x['id']))
            writer.writerows(sorted_personas)
        
        print(f"Successfully saved {len(personas)} personas to {output_file}")
        
        # 显示统计信息
        successful_updates = sum(1 for p in personas if p['status'] == 'updated')
        failed_updates = len(personas) - successful_updates
        print(f"Statistics:")
        print(f"  - Successfully updated: {successful_updates}")
        print(f"  - Failed updates: {failed_updates}")
        
    except Exception as e:
        print(f"Error saving CSV file: {e}")

def main():
    log_file_path = "/Users/clayzhang/Code/hugo-tour-dashboard/batchUpdatePersonaAvatars.log"
    
    # 生成输出文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"persona_data_{timestamp}.csv"
    
    print(f"Processing log file: {log_file_path}")
    print(f"Output file: {output_file}")
    
    # 提取数据
    personas = extract_persona_data(log_file_path)
    
    if personas:
        print(f"Found {len(personas)} unique personas")
        
        # 显示前几个persona作为预览
        print("\nSample personas:")
        for i, persona in enumerate(personas[:3]):
            print(f"  {i+1}. ID: {persona['id']}, Name: {persona['name']}")
            if persona['description']:
                print(f"     Description: {persona['description']}")
        
        # 保存为 CSV
        save_to_csv(personas, output_file)
        
        # 显示文件位置
        abs_output_path = os.path.abspath(output_file)
        print(f"\nCSV file saved at: {abs_output_path}")
        
    else:
        print("No persona data found in the log file.")

if __name__ == "__main__":
    main() 