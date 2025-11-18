# 🍌 AI Image Editor - Node Based

Ứng dụng web chỉnh sửa ảnh bằng AI sử dụng Google Gemini API với giao diện node-based, được phục vụ hoàn toàn từ Flask và lưu lịch sử xử lý trong database nội bộ.

## ✨ Tính năng

- 🖼️ **Upload nhiều ảnh**: Tạo nhiều Image Input nodes và upload ảnh khác nhau.
- 🎨 **AI Processor**: Node AI tích hợp prompt, status và nút chạy.
- 📤 **Image Output**: Xem, tải ảnh kết quả.
- 🗂️ **Lịch sử xử lý**: Ghi nhận mọi job (ảnh input, output, trạng thái) trong database và hiển thị trong UI.
- 🔗 **Node-based workflow**: Kéo thả để kết nối các nodes.

## 🚀 Khởi động nhanh

### Cách 1: Sử dụng script (Khuyến nghị)

```bash
# Cấu hình biến môi trường (nếu chưa có)
cp .env.example .env
vim .env  # hoặc editor bất kỳ, cập nhật GEMINI_API_KEY

# Khởi động
./start.sh

# Dừng server
./stop.sh
```

### Cách 2: Khởi động thủ công

```bash
# 1. Kích hoạt virtual environment
source venv/bin/activate

# 2. Cài env
cp .env.example .env
# Rồi cập nhật GEMINI_API_KEY trong file .env

# 3. Chạy server Flask
python app.py

# 4. Truy cập http://localhost:5000 trong trình duyệt
```

## 📋 Yêu cầu

- Python 3.8+
- Google Gemini API Key
- SQLite (được tạo tự động tại `data/app.db`, có thể đổi sang DB khác qua `DATABASE_URL`)
- Trình duyệt web hiện đại

## 🔧 Cài đặt

```bash
# Tạo virtual environment
python3 -m venv venv

# Kích hoạt
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate  # Windows

# Cài đặt dependencies (Flask + Gemini + SQLAlchemy)
pip install -r requirements.txt

# Chuẩn bị file .env
cp .env.example .env

# Chỉnh sửa .env và cập nhật GEMINI_API_KEY
vim .env
```

## 🔑 Cấu hình API Key

1. Lấy API key tại: https://aistudio.google.com/app/apikey
2. Chạy `cp .env.example .env`
3. Mở file `.env` và điền giá trị cho `GEMINI_API_KEY`
4. (Tuỳ chọn) set `DATABASE_URL` nếu dùng Postgres/MySQL nội bộ

## 📖 Hướng dẫn sử dụng

1. **Thêm nodes**:
   - Click "Image Input" để upload ảnh (có thể nhiều nodes).
   - Click "AI Processor" để thêm node AI (đã kèm vùng nhập prompt).
   - Click "Image Output" để xem kết quả.

2. **Kết nối nodes**:
   - Kéo từ Image Input (output port) → AI Processor (input port).
   - Kéo từ AI Processor (output port) → Image Output (input port).

3. **Xử lý**:
   - Nhập prompt trực tiếp trong node AI.
   - Click nút "▶ Chạy" trong node AI và theo dõi trạng thái.
   - Kết quả hiển thị tại node Image Output, có thể kéo dây từ node Output sang một node AI khác để tiếp tục chỉnh sửa, đồng thời được lưu vào lịch sử/thư viện.

## 🎨 Ví dụ Workflow

```
[Image Input 1] ──┐
[Image Input 2] ──┤
[Image Input 3] ──┼──> [AI Processor + Prompt] ──> [Image Output]
```

- UI có thêm panel bên phải gồm **Lịch sử xử lý** và **Thư viện ảnh** để xem, tải, xoá ảnh đã tạo.

## 📦 Lưu trữ & Database

- Tất cả ảnh input/output được lưu vào `uploads/` và `outputs/` tương ứng.
- Job, trạng thái và metadata ảnh được ghi vào database (mặc định SQLite tại `data/app.db`).
- API nội bộ:
  - `GET /api/jobs` – danh sách job gần nhất (kèm assets).
  - `GET /api/jobs/<id>` – chi tiết một job.
  - `GET /api/assets?kind=output` – thư viện ảnh đã tạo.
  - `DELETE /api/assets/<id>` – xoá ảnh khỏi thư viện + storage.
  - `GET /files/<path>` – truy cập ảnh đã lưu (được UI sử dụng).

Để chuyển sang DB khác (Postgres/MySQL), cập nhật `DATABASE_URL` trong `.env` theo chuẩn SQLAlchemy, ví dụ: `DATABASE_URL=postgresql+psycopg2://user:pass@host/dbname`.

## 📁 Cấu trúc Project

```
Blockly/
├── app.py                 # Flask backend + API + DB layer
├── templates/
│   └── index.html         # Node-based UI (render bởi Flask)
├── static/
│   ├── css/app.css        # Styling
│   └── js/app.js          # Frontend logic + history panel
├── uploads/               # Ảnh input được lưu lại
├── outputs/               # Ảnh kết quả được lưu lại
├── data/app.db            # SQLite database (tự tạo)
├── start.sh / stop.sh     # Scripts vận hành nội bộ
├── requirements.txt       # Dependencies
├── .env.example           # Mẫu cấu hình
└── README.md              # Tài liệu này
```

## 🐛 Troubleshooting

**Lỗi: Port 5000 đã được sử dụng**
```bash
./stop.sh  # Dừng server cũ
```

**Lỗi: API key not set**
- Kiểm tra `.env` đã chứa `GEMINI_API_KEY` chưa.
- Nếu chạy dưới systemd/docker, đảm bảo biến env được load.

**Lỗi: Database**
- Xoá file `data/app.db` (nếu corrupted) và khởi động lại để Flask tự tạo.
- Kiểm tra quyền ghi của thư mục `data/`, `uploads/`, `outputs/`.

**Lỗi: Module not found**
- Chạy `pip install -r requirements.txt`.

## 📝 License

MIT License

## 🧾 Ví dụ đọc dữ liệu Notion

Script `notion_fetch.py` minh họa cách lấy dữ liệu từ Notion Database bằng Python:

1. Tạo Notion integration và copy token tại https://www.notion.so/my-integrations, sau đó chia sẻ database/page cần đọc cho integration đó.
2. Cập nhật `.env`:
   - `NOTION_API_KEY` – token vừa tạo.
   - `NOTION_DATABASE_ID` – phần slug trong URL của database.
3. Cài dependencies (đã có trong `requirements.txt`): `pip install -r requirements.txt`.
4. Chạy `python notion_fetch.py`. Script sẽ gọi `databases.query`, tự động phân trang và in ra toàn bộ properties của từng dòng.
