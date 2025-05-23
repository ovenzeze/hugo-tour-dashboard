#!/bin/bash

# 博物馆数据收集 - 快速启动脚本
# 用于批量添加世界知名博物馆到数据库

echo "🏛️ 博物馆数据自动收集 - 快速启动"
echo "=================================="

# 检查环境配置
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请先配置 SUPABASE_URL, SUPABASE_KEY 和 LLM API Keys"
    exit 1
fi

# 显示当前数据库统计
echo "📊 当前数据库统计:"
pnpm run museum-enrichment stats

echo ""
echo "🚀 开始批量添加博物馆..."
echo ""

# 世界知名博物馆列表
museums=(
    "故宫博物院"
    "大英博物馆" 
    "卢浮宫"
    "纽约大都会艺术博物馆"
    "梵蒂冈博物馆"
    "俄罗斯国立艾尔米塔什博物馆"
    "东京国立博物馆"
    "国家美术馆"
    "泰特现代美术馆"
    "古根海姆博物馆"
)

# 批量处理
total=${#museums[@]}
current=0

for museum in "${museums[@]}"; do
    current=$((current + 1))
    echo "[$current/$total] 正在处理: $museum"
    
    # 执行创建命令
    pnpm run museum-enrichment create "$museum"
    
    # 检查执行结果
    if [ $? -eq 0 ]; then
        echo "✅ 成功创建: $museum"
    else
        echo "❌ 创建失败: $museum"
    fi
    
    echo "---"
    
    # 添加延迟避免API限制
    if [ $current -lt $total ]; then
        echo "⏳ 等待 3 秒后继续..."
        sleep 3
    fi
    echo ""
done

echo "🎉 批量处理完成!"
echo ""

# 显示最终统计
echo "📊 最终数据库统计:"
pnpm run museum-enrichment stats

echo ""
echo "💡 提示:"
echo "- 您可以使用 'pnpm run museum-enrichment enrich [id]' 来补充现有博物馆信息"
echo "- 使用 'pnpm run museum-enrichment search \"博物馆名称\"' 来预览搜索结果"
echo "- 查看完整文档: docs/museum-data-enrichment-guide.md" 