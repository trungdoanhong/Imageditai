from flask import (
    Flask,
    abort,
    jsonify,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import base64
import mimetypes
import uuid
from datetime import datetime
from google import genai
from google.genai import types

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')
for folder in (DATA_DIR, UPLOAD_FOLDER, OUTPUT_FOLDER):
    os.makedirs(folder, exist_ok=True)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    f"sqlite:///{os.path.join(DATA_DIR, 'app.db')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db = SQLAlchemy(app)


class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), nullable=False, default='pending')
    result_text = db.Column(db.Text)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    assets = db.relationship(
        'ImageAsset',
        backref='job',
        cascade='all, delete-orphan',
        lazy=True,
    )

    def to_dict(self, include_assets=False):
        data = {
            'id': self.id,
            'prompt': self.prompt,
            'status': self.status,
            'result_text': self.result_text,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_assets:
            data['assets'] = [asset.to_dict() for asset in self.assets]
        return data


class ImageAsset(db.Model):
    __tablename__ = 'image_assets'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    kind = db.Column(db.String(16), nullable=False)  # input | output
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)

    def to_dict(self):
        file_url = url_for('serve_file', relative_path=self.file_path, _external=False)
        return {
            'id': self.id,
            'job_id': self.job_id,
            'kind': self.kind,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_url': file_url,
        }


def get_gemini_client():
    """Khởi tạo Gemini client"""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return genai.Client(api_key=api_key)


def save_binary_file(data_bytes, mime_type, folder, prefix):
    extension = mimetypes.guess_extension(mime_type) or '.png'
    file_name = f"{prefix}_{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(folder, file_name)
    with open(file_path, 'wb') as f:
        f.write(data_bytes)
    return file_name, os.path.relpath(file_path, BASE_DIR)


def save_data_url_image(data_url, folder, prefix):
    if not data_url.startswith('data:'):
        raise ValueError('Invalid image payload')
    header, encoded = data_url.split(',', 1)
    mime_type = header.split(';')[0].split(':')[1]
    image_bytes = base64.b64decode(encoded)
    file_name, rel_path = save_binary_file(image_bytes, mime_type, folder, prefix)
    return {
        'file_name': file_name,
        'relative_path': rel_path,
        'mime_type': mime_type,
    }


@app.route('/')
def index():
    """Trang chủ: giao diện node-based"""
    return render_template('index.html')


@app.route('/files/<path:relative_path>')
def serve_file(relative_path):
    safe_path = os.path.normpath(relative_path)
    if safe_path.startswith('..'):
        abort(404)

    full_path = os.path.join(BASE_DIR, safe_path)
    if not (
        full_path.startswith(UPLOAD_FOLDER)
        or full_path.startswith(OUTPUT_FOLDER)
    ):
        abort(404)

    directory, filename = os.path.split(full_path)
    if not os.path.isfile(full_path):
        abort(404)
    return send_from_directory(directory, filename)


@app.route('/api/generate', methods=['POST'])
def generate_image():
    """API endpoint để tạo ảnh từ prompt và ảnh input"""
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '').strip()
    images = data.get('images', [])

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    job = Job(prompt=prompt, status='processing')
    db.session.add(job)
    db.session.commit()

    try:
        for idx, img_data in enumerate(images):
            stored = save_data_url_image(
                img_data,
                UPLOAD_FOLDER,
                prefix=f"job{job.id}_input{idx}",
            )
            db.session.add(
                ImageAsset(
                    job_id=job.id,
                    kind='input',
                    file_name=stored['file_name'],
                    file_path=stored['relative_path'],
                )
            )
        db.session.commit()
    except ValueError as exc:
        job.status = 'error'
        job.error_message = str(exc)
        db.session.commit()
        return jsonify({'error': str(exc), 'job_id': job.id}), 400

    try:
        client = get_gemini_client()
    except Exception as exc:
        job.status = 'error'
        job.error_message = str(exc)
        db.session.commit()
        return jsonify({'error': str(exc), 'job_id': job.id}), 500

    model = "gemini-2.5-flash-image"

    parts = [types.Part.from_text(text=prompt)]
    for img_data in images:
        if not img_data.startswith('data:'):
            continue
        header, encoded = img_data.split(',', 1)
        mime_type = header.split(';')[0].split(':')[1]
        image_bytes = base64.b64decode(encoded)
        parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))

    contents = [
        types.Content(
            role="user",
            parts=parts,
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        image_config=types.ImageConfig(
            image_size="1K",  # Có thể đổi: "256", "512", "1K", "2K"
        ),
    )

    generated_images = []
    generated_text = []

    try:
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

            content_part = chunk.candidates[0].content.parts[0]

            if getattr(content_part, 'inline_data', None) and content_part.inline_data.data:
                inline_data = content_part.inline_data
                image_bytes = inline_data.data
                mime_type = inline_data.mime_type

                image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                data_url = f"data:{mime_type};base64,{image_base64}"
                generated_images.append(data_url)

                file_name, rel_path = save_binary_file(
                    image_bytes,
                    mime_type,
                    OUTPUT_FOLDER,
                    prefix=f"job{job.id}_output",
                )
                db.session.add(
                    ImageAsset(
                        job_id=job.id,
                        kind='output',
                        file_name=file_name,
                        file_path=rel_path,
                    )
                )
            elif getattr(chunk, 'text', None):
                generated_text.append(chunk.text)

        job.status = 'completed'
        job.result_text = ''.join(generated_text)
        db.session.commit()

        return jsonify({
            'success': True,
            'job_id': job.id,
            'images': generated_images,
            'text': job.result_text or '',
        })

    except Exception as exc:
        job.status = 'error'
        job.error_message = str(exc)
        db.session.commit()
        return jsonify({'error': str(exc), 'job_id': job.id}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    api_key_ok = True
    db_ok = True
    try:
        get_gemini_client()
    except Exception:
        api_key_ok = False

    try:
        Job.query.first()
    except Exception:
        db_ok = False

    status_code = 200 if api_key_ok and db_ok else 500
    return jsonify({
        'status': 'ok' if status_code == 200 else 'error',
        'api_key_set': api_key_ok,
        'database_ok': db_ok,
    }), status_code


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    limit = request.args.get('limit', default=20, type=int)
    limit = max(1, min(limit, 100))
    jobs = (
        Job.query.order_by(Job.created_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify([job.to_dict(include_assets=True) for job in jobs])


@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = Job.query.get_or_404(job_id)
    return jsonify(job.to_dict(include_assets=True))


@app.route('/api/assets', methods=['GET'])
def list_assets():
    kind = request.args.get('kind')
    limit = request.args.get('limit', default=50, type=int)
    limit = max(1, min(limit, 200))

    query = ImageAsset.query.order_by(ImageAsset.id.desc())
    if kind in {'input', 'output'}:
        query = query.filter_by(kind=kind)

    assets = query.limit(limit).all()
    return jsonify([asset.to_dict() for asset in assets])


@app.route('/api/assets/<int:asset_id>', methods=['DELETE'])
def delete_asset(asset_id):
    asset = ImageAsset.query.get_or_404(asset_id)
    file_path = os.path.join(BASE_DIR, asset.file_path)

    db.session.delete(asset)
    db.session.commit()

    if os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    return jsonify({'success': True, 'deleted_id': asset_id})


with app.app_context():
    db.create_all()


if __name__ == '__main__':
    print("🚀 Starting AI Image Editor Server...")
    print("📝 Make sure GEMINI_API_KEY is set in environment")
    print("🌐 Server will run at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
