# Samanta AI Assistant 🌸

A kawaii-style AI assistant web application featuring voice interaction, real-time speech processing, and memory capabilities.

## ✨ Features

### Frontend
- 🎨 Kawaii-style UI with responsive design
- 🎤 Real-time voice interaction with silence detection
- 🌓 Light/Dark mode support
- 💫 Smooth animations and transitions
- 🔊 Text-to-Speech using OpenAI's TTS API

### Backend
- 🎯 Accurate speech recognition with WhisperX
- 🎤 Browser-based Voice Activity Detection
- 🧠 Memory capabilities through Memobase integration
- 🗣️ High-quality Text-to-Speech with OpenAI
- 💭 LLM integration with Ollama

Coming Soon:
- ⚡ Real-time interruption system
- TTS optimization for Macos [lightning-whisper-mlx](https://github.com/mustafaaljadery/lightning-whisper-mlx?tab=readme-ov-file#lightning-whisper-mlx)
- Movie and TV show recommendations
- News and updates
- Weather forecast
- Song and music recommendations
- Web search
- Image generation (API Paywall)

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js
- Docker and Docker Compose (for Memobase)
- FFmpeg (for audio processing)
- Ollama installed and running

### Backend Setup

1. Create and activate Python virtual environment:

```bash
uv sync
```

2. Set up environment variables:

```bash
# Create .env file in backend directory
cp .env.example .env
# Edit .env with your API keys and configurations
```

3. Set up Memobase:

```bash
# Navigate to memobase directory
cd memobase/src/server

# Start Memobase services
docker-compose up -d
```

4. Configure Memobase:
Edit `memobase/src/server/api/config.yaml`:
```yaml
llm_api_key: ollama
llm_base_url: http://host.docker.internal:11434/v1
best_llm_model: phi4  # Must match your Ollama model
```

5. Start the backend server:

```bash
uvicorn main:app --reload
```

### Frontend Setup

1. Install Node.js dependencies:

```bash
cd frontend
npm install
```

2. Set up environment variables:

```bash
# Create .env.local file in frontend directory
cp .env.example .env.local
# Edit .env.local with your configurations
```

3. Start the development server:

```bash
npm run dev
```

## 🛠️ Tech Stack

### Frontend
- Next.js
- TailwindCSS
- Pixi Live2D Display
- WebRTC

### Backend
- Python 3.12
- FastAPI
- pyannote.audio
- WhisperX
- Ollama
- OpenAI (Coming Soon)

### LLM Inference Server
- Ollama
- OpenAI (Coming Soon)

### LLM Memory
- Memobase

### TTS
- OpenAI (not hd model, meaning the cheapest one but still good)

## 📁 Project Structure

```
project-root/
├── backend/
│   ├── main.py              # FastAPI application
│   │   ├── services/
│   │   │   ├── vad.py          # Voice Activity Detection
│   │   │   ├── stt.py          # Speech-to-Text
│   │   │   ├── tts.py          # Text-to-Speech
│   │   │   └── llm.py          # Language Model
│   │   └── requirements.txt
│   │
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── Live2DModel.js
│   │   │   └── AudioTranscriber.js
│   │   ├── pages/
│   │   ├── public/
│   │   │   └── live2d/         # Live2D model assets
│   │   └── styles/
│   │
│   └── docs/
│       ├── CHANGELOG.md
│       ├── CONTRIBUTING.md
│       ├── CODE_OF_CONDUCT.md
│       ├── SECURITY.md
│       └── LICENSE.md
```

## ⚙️ Configuration

### Backend Configuration

```env
HF_TOKEN=your_huggingface_token
OPENAI_API_KEY=your_openai_key
INFERENCE_SERVER=ollama
OLLAMA_MODEL=your_model_name
USER_NAME=your_username
STREAM=True
STT_LANGUAGE=it  # Language for speech recognition
```

### Frontend Configuration

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Memobase Configuration
Required files:
- memobase/src/server/api/.env
- memobase/src/server/api/config.yaml
- memobase/src/server/.env

### API Endpoints

- `POST /api/transcribe` - Speech-to-text conversion
- `POST /api/chat` - Chat with memory-enabled LLM
- `POST /api/tts` - Text-to-speech conversion
- `POST /api/detect-voice` - Voice activity detection

## 🤝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed contribution guidelines.

Quick start:
1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please read our [Code of Conduct](docs/CODE_OF_CONDUCT.md) before contributing.

## 📜 License

This project is licensed under the MIT License - see [LICENSE.md](docs/LICENSE.md) for details.

## 🔒 Security

See [SECURITY.md](docs/SECURITY.md) for reporting security vulnerabilities.

For immediate security concerns, please contact [wasamikiruasan@gmail.com](mailto:wasamikiruasan@gmail.com).

## 🙏 Acknowledgments

- [Worklet Processor Inpiration](https://medium.com/@shanur.cse.nitap/you-cant-handle-real-time-voice-transcription-with-next-js-can-you-80221aa5595e)
- [WhisperX](https://github.com/m-bain/whisperX)

## 📝 Changelog

See [CHANGELOG.md](docs/CHANGELOG.md) for a list of changes and versions.






