#!/bin/bash

# Script khởi động AI Image Editor
# Sử dụng: ./start.sh hoặc bash start.sh

echo "🚀 Đang khởi động AI Image Editor..."

# Kiểm tra virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Không tìm thấy virtual environment!"
    echo "📝 Tạo virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Kiểm tra API key
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Cảnh báo: GEMINI_API_KEY chưa được set!"
    echo "📝 Chạy: export GEMINI_API_KEY='your-api-key'"
    echo ""
fi

# Kiểm tra xem server đã chạy chưa
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5000 đã được sử dụng. Đang dừng process cũ..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Khởi động Flask server trong background
echo "🌐 Đang khởi động Flask server tại http://localhost:5000..."
python app.py > server.log 2>&1 &
SERVER_PID=$!

# Đợi server khởi động
sleep 3

# Kiểm tra server có chạy không
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Server đã khởi động thành công!"
    echo "📝 Server PID: $SERVER_PID"
    echo "📄 Logs: tail -f server.log"
    echo ""
    
    # Mở trình duyệt
    APP_URL="http://localhost:5000"
    echo "🌐 Đang mở trình duyệt (${APP_URL})..."
    {
        open "$APP_URL" 2>/dev/null || xdg-open "$APP_URL" 2>/dev/null
    } || echo "Vui lòng mở $APP_URL trong trình duyệt"
    
    echo ""
    echo "✨ Ứng dụng đã sẵn sàng!"
    echo "🛑 Để dừng server: kill $SERVER_PID hoặc ./stop.sh"
else
    echo "❌ Không thể khởi động server. Kiểm tra server.log để xem lỗi."
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
