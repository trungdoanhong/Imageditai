# To run this code you need to install the following dependencies:
# pip install google-genai
#
# Setup API key:
# export GEMINI_API_KEY="your-api-key-here"
# Or set it directly in the code below

import base64
import mimetypes
import os
from datetime import datetime
from google import genai
from google.genai import types


def save_binary_file(file_name, data):
    """Lưu file binary (ảnh) vào thư mục hiện tại"""
    f = open(file_name, "wb")
    f.write(data)
    f.close()
    print(f"✅ File saved to: {file_name}")


def generate():
    # Lấy API key từ environment variable hoặc đặt trực tiếp
    api_key = os.environ.get("GEMINI_API_KEY")
    
    # Nếu không có trong env, bạn có thể đặt trực tiếp ở đây:
    # api_key = "YOUR_API_KEY_HERE"
    
    if not api_key:
        print("❌ Lỗi: Chưa có API key!")
        print("📝 Hướng dẫn:")
        print("   1. Tạo API key tại: https://aistudio.google.com/app/apikey")
        print("   2. Chạy: export GEMINI_API_KEY='your-api-key'")
        print("   3. Hoặc sửa code và đặt API key trực tiếp")
        return
    
    try:
        client = genai.Client(api_key=api_key)
        
        # Model tạo ảnh và text
        model = "gemini-2.5-flash-image"
        
        # Prompt của bạn - có thể sửa ở đây
        prompt = "Tạo một bức tranh đơn giản về một quả chuối vàng trên nền trắng, kèm mô tả ngắn gọn"
        
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                ],
            ),
        ]
        
        generate_content_config = types.GenerateContentConfig(
            response_modalities=[
                "IMAGE",
                "TEXT",
            ],
            image_config=types.ImageConfig(
                image_size="1K",  # Có thể đổi: "256", "512", "1K", "2K"
            ),
        )
        
        print(f"🚀 Đang tạo nội dung với model: {model}")
        print(f"📝 Prompt: {prompt}\n")
        
        file_index = 0
        text_output = []
        
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if (
                chunk.candidates is None
                or chunk.candidates[0].content is None
                or chunk.candidates[0].content.parts is None
            ):
                continue
                
            # Xử lý ảnh
            if chunk.candidates[0].content.parts[0].inline_data and chunk.candidates[0].content.parts[0].inline_data.data:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                file_name = f"generated_image_{timestamp}_{file_index}"
                file_index += 1
                inline_data = chunk.candidates[0].content.parts[0].inline_data
                data_buffer = inline_data.data
                file_extension = mimetypes.guess_extension(inline_data.mime_type) or ".png"
                save_binary_file(f"{file_name}{file_extension}", data_buffer)
            # Xử lý text
            elif chunk.text:
                text_output.append(chunk.text)
                print(chunk.text, end="", flush=True)
        
        if text_output:
            print("\n\n✅ Hoàn thành!")
        else:
            print("\n✅ Đã tạo ảnh thành công!")
            
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        print("\n💡 Kiểm tra:")
        print("   - API key có đúng không?")
        print("   - Có kết nối internet không?")
        print("   - API key có đủ quota không?")


if __name__ == "__main__":
    generate()