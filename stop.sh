#!/bin/bash

# Script dừng AI Image Editor
# Sử dụng: ./stop.sh hoặc bash stop.sh

echo "🛑 Đang dừng AI Image Editor..."

# Tìm và kill process Flask trên port 5000
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -ti:5000)
    kill $PID 2>/dev/null
    echo "✅ Đã dừng server (PID: $PID)"
else
    echo "ℹ️  Không có server nào đang chạy trên port 5000"
fi

# Tìm và kill các process Python app.py
pkill -f "python.*app.py" 2>/dev/null
echo "✅ Đã dọn dẹp các process"

