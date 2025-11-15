# 🍌 AI Image Editor - Nano Banana

Ứng dụng web chỉnh sửa và tạo ảnh bằng AI sử dụng Google Gemini API.

## ✨ Tính năng

- 📸 **Upload nhiều ảnh**: Kéo thả hoặc click để chọn nhiều ảnh
- ✨ **Tạo ảnh từ prompt**: Nhập mô tả để AI tạo ảnh mới
- 🎨 **Chỉnh sửa ảnh**: Upload ảnh + prompt để chỉnh sửa theo ý muốn
- 💾 **Download kết quả**: Tải ảnh đã tạo về máy
- 🎯 **Giao diện đẹp**: UI hiện đại, dễ sử dụng

## 📋 Yêu cầu

- Python 3.8+
- Google Gemini API Key

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
# Kích hoạt virtual environment (nếu có)
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate  # Windows

# Cài đặt packages
pip install -r requirements.txt
```

### 2. Cấu hình API Key

**Cách 1: Environment Variable (Khuyến nghị)**

```bash
export GEMINI_API_KEY="your-api-key-here"
```

**Cách 2: Trong code**

Sửa file `app.py`, dòng 18:
```python
api_key = "your-api-key-here"  # Thay thế
```

### 3. Chạy ứng dụng

```bash
python app.py
```

Server sẽ chạy tại: **http://localhost:5000**

## 📖 Hướng dẫn sử dụng

1. **Mở trình duyệt**: Truy cập http://localhost:5000

2. **Upload ảnh** (tùy chọn):
   - Kéo thả ảnh vào vùng upload
   - Hoặc click để chọn file
   - Có thể upload nhiều ảnh cùng lúc

3. **Nhập prompt**:
   - Mô tả ảnh bạn muốn tạo
   - Hoặc mô tả cách chỉnh sửa ảnh đã upload
   - Sử dụng các gợi ý có sẵn

4. **Tạo ảnh**:
   - Nhấn nút "✨ Tạo ảnh"
   - Đợi AI xử lý (có thể mất vài giây)

5. **Download**:
   - Click nút "💾 Tải về" trên ảnh đã tạo

## 🎨 Ví dụ Prompts

- `Tạo một bức tranh về quả chuối vàng trên nền trắng, phong cách minimalist`
- `Chuyển đổi ảnh thành phong cách anime, màu sắc tươi sáng`
- `Tạo phiên bản 3D của ảnh với hiệu ứng ánh sáng đẹp`
- `Thêm hiệu ứng bokeh và làm mờ nền`
- `Tạo ảnh chân dung với phong cách vintage`

## 🔧 Cấu trúc Project

```
Blockly/
├── app.py                 # Flask backend server
├── api-ex.py             # Script Python gốc
├── requirements.txt      # Dependencies
├── templates/
│   └── ai_editor.html    # Frontend HTML
├── static/
│   ├── editor.css       # Styling
│   └── editor.js        # Frontend logic
└── README_AI_EDITOR.md  # Hướng dẫn này
```

## ⚠️ Lưu ý

- API key cần được bảo mật, không commit lên Git
- Có thể có giới hạn quota từ Google Gemini API
- Ảnh được tạo với kích thước 1K (có thể thay đổi trong `app.py`)

## 🐛 Troubleshooting

**Lỗi: API key not set**
- Kiểm tra environment variable: `echo $GEMINI_API_KEY`
- Hoặc sửa trực tiếp trong `app.py`

**Lỗi: Connection refused**
- Đảm bảo server đang chạy: `python app.py`
- Kiểm tra port 5000 có bị chiếm không

**Lỗi: Quota exceeded**
- API key đã hết quota
- Tạo API key mới tại: https://aistudio.google.com/app/apikey

## 📝 License

MIT License

