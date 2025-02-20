#!/usr/bin/env python3.12
"""
Samanta Virtual Assistant Backend with FastAPI Endpoints

This script initializes the AssistantBackend and sets up API endpoints for:
- Voice Detection (using pyannote.audio)
- Speech-to-Text (Transcription, using WhisperX)
- Text-to-Speech (TTS, currently simulated)
- Interruption handling

Run with:
    uvicorn main:app --reload
"""

# Python
import json
import base64
import io
import soundfile as sf
import re
import unicodedata
import asyncio
import os
import tempfile

# WhisperX
import whisperx  # Make sure you have installed whisperx

# FastAPI
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Pyannote
from pyannote.audio import Pipeline
from dotenv import load_dotenv
import subprocess
from fastapi.responses import StreamingResponse

# Memobase
from memobase import MemoBaseClient
from openai import OpenAI
from memobase.patch.openai import openai_memory
from time import sleep

# Load environment variables from a .env file
load_dotenv()

stream = os.getenv("STREAM", "True") == "True"
user_name = os.getenv("USER_NAME", "test35")

class AssistantBackend:
    def __init__(self):
        # Get the Hugging Face token from environment variables.
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            print("Warning: HF_TOKEN environment variable not set. Voice detection may fail!")
        # Initialize the pyannote.audio pipeline for Voice Activity Detection.
        self.vad_pipeline = Pipeline.from_pretrained("pyannote/voice-activity-detection", use_auth_token=hf_token)
        print("AssistantBackend initialized with VAD pipeline.")

        # Load the WhisperX model for Speech-to-Text on CPU with int8 compute type.
        print("Loading WhisperX model...")
        self.stt_model = whisperx.load_model(
            "base",
            device="cpu",
            compute_type="int8",
            language="it",  # Set Italian as default language
            asr_options={"no_speech_threshold": 0.6}
        )
        print("WhisperX model loaded.")

        # Initialize OpenAI clients
        if os.getenv("INFERENCE_SERVER") == "ollama":
            self.client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
        else:
            self.client = OpenAI()
        
        # Initialize MemoBase client
        self.mb_client = MemoBaseClient(
            project_url="http://localhost:8019",
            api_key="secret",
        )
        self.client = openai_memory(self.client, self.mb_client)

        # Initialize separate TTS client that always uses OpenAI API
        self.tts_client = OpenAI(
            base_url="https://api.openai.com/v1",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        if not os.getenv("OPENAI_API_KEY"):
            print("Warning: OPENAI_API_KEY not set. TTS functionality will not work!")

    def chat(self, message, close_session=True, use_users=True):
        print("Q: ", message)
        print()
        # Prepare the request parameters
        request_params = {
            "messages": [{"role": "user", "content": message}],
            "model": os.getenv("OLLAMA_MODEL"),
            "stream": stream,
            "user_id": user_name if use_users else None,
        }

        # Make the request
        try:
            r = self.client.chat.completions.create(**request_params)
        except KeyError as e:
            if str(e) == "'user_id'":
                print("Warning: 'user_id' key not found in request parameters.")
            else:
                raise

        if stream:
            for i in r:
                if not i.choices[0].delta.content:
                    continue
                print(i.choices[0].delta.content, end="", flush=True)
            print()
        else:
            print(r.choices[0].message.content)

        if close_session:
            sleep(0.1)
            self.client.flush(user_name)

    def detect_voice(self, audio_data: bytes):
        """
        Detect voice activity in the given audio data using pyannote.audio.
        This method writes the audio data to a temporary .wav file,
        passes it through the VAD pipeline, and returns voice segments.

        Returns:
            List[dict]: A list of segments where voice was detected.
                        Each segment is represented as {"start": float, "end": float}
        """
        # Write audio data to temporary .wav file.
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            temp_audio.write(audio_data)
            temp_audio.flush()
            temp_filename = temp_audio.name

        # Process the .wav file using VAD pipeline.
        annotation = self.vad_pipeline(temp_filename)

        # Clean up temporary file.
        os.remove(temp_filename)

        segments = []
        if annotation:
            for segment in annotation.get_timeline().support():
                segments.append({"start": segment.start, "end": segment.end})
        return segments

    async def speech_to_text(self, file: UploadFile) -> str:
        try:
            print(f"Processing file: {file.filename}, size: {file.size} bytes")
            
            # Create temporary files
            temp_webm = tempfile.NamedTemporaryFile(suffix='.webm', delete=False)
            temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
            
            try:
                # Save the uploaded WebM file
                content = await file.read()
                temp_webm.write(content)
                temp_webm.flush()  # Ensure all data is written
                os.fsync(temp_webm.fileno())  # Force write to disk
                temp_webm.close()
                
                print(f"WebM file saved: {temp_webm.name}, size: {os.path.getsize(temp_webm.name)} bytes")
                
                # Convert WebM to WAV using ffmpeg with more robust options
                print("Converting WebM to WAV...")
                result = subprocess.run([
                    'ffmpeg',
                    '-y',
                    '-fflags', '+discardcorrupt+genpts',  # More tolerant of corrupted input
                    '-i', temp_webm.name,
                    '-af', 'aresample=async=1000',  # More tolerant of async audio
                    '-acodec', 'pcm_s16le',
                    '-ar', '16000',
                    '-ac', '1',
                    '-f', 'wav',
                    '-loglevel', 'warning',  # Reduce log noise
                    temp_wav.name
                ], capture_output=True, text=True, timeout=10)
                
                if result.returncode != 0:
                    print(f"FFmpeg error: {result.stderr}")
                    raise Exception(f"FFmpeg conversion failed: {result.stderr}")
                
                if not os.path.exists(temp_wav.name) or os.path.getsize(temp_wav.name) == 0:
                    raise Exception("WAV file is empty or not created")
                
                print(f"WAV file created: {temp_wav.name}, size: {os.path.getsize(temp_wav.name)} bytes")

                # Transcribe the WAV file
                print("Starting transcription...")
                result = self.stt_model.transcribe(
                    temp_wav.name,
                    language=os.getenv("STT_LANGUAGE")
                )
                print("Raw transcription result:", result)  # Debug print
                
                # Handle WhisperX result format correctly
                if isinstance(result, dict) and 'segments' in result:
                    # Combine all segments
                    transcription = ' '.join(segment['text'] for segment in result['segments']).strip()
                else:
                    # Fallback for different result format
                    transcription = str(result).strip()
                
                print(f"Transcription completed: '{transcription}'")
                return transcription

            finally:
                # Clean up temporary files
                print("Cleaning up temporary files...")
                if os.path.exists(temp_webm.name):
                    os.unlink(temp_webm.name)
                if os.path.exists(temp_wav.name):
                    os.unlink(temp_wav.name)
                print("Cleanup completed")

        except subprocess.TimeoutExpired:
            print("FFmpeg conversion timed out")
            return ""
        except Exception as e:
            print(f"Error during transcription process: {str(e)}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return ""

    def text_to_speech(self, text: str) -> bytes:
        """
        Simulate text-to-speech conversion by returning dummy audio data.
        """
        print("Converting text to speech:", text)
        return b"DummyAudioData"

    def handle_interruption(self) -> bool:
        """
        Simulate handling an interruption.
        """
        print("Handling interruption request.")
        return True

# Create FastAPI app instance.
app = FastAPI(
    title="Samanta Virtual Assistant Backend API",
    description="API endpoints for voice detection, transcription, TTS, and interruption handling.",
    version="0.1.0"
)

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the backend assistant.
backend_instance = AssistantBackend()

@app.get("/")
def root():
    return {"message": "Samanta Virtual Assistant backend is running!"}

@app.post("/api/detect-voice")
async def detect_voice_endpoint(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        segments = backend_instance.detect_voice(audio_bytes)
        return {"voice_segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    print(f"Received audio file for transcription: {file.filename}")
    transcription = await backend_instance.speech_to_text(file)
    
    # Check if transcription is empty
    if not transcription or transcription.strip() == '':
        raise HTTPException(
            status_code=400,
            detail="No speech detected in the audio"
        )
    
    print(f"Returning transcription: '{transcription}'")
    return {"transcription": transcription}

class TextInput(BaseModel):
    text: str

@app.post("/api/speak")
def speak_text(input_data: TextInput):
    try:
        audio_data = backend_instance.text_to_speech(input_data.text)
        return {"message": "Text-to-Speech conversion successful.", "audio_length": len(audio_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interrupt")
def interrupt():
    try:
        result = backend_instance.handle_interruption()
        return {"status": "interrupted", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    message: str

@app.post("/api/chat")
async def chat(message_data: ChatMessage):
    try:
        messages = [
            {"role": "system", "content": "Sei Samanta, una compagna senziente e empatica."},
            {"role": "user", "content": message_data.message}
        ]
        
        async def generate():
            completion = backend_instance.client.chat.completions.create(
                messages=messages,
                model=os.getenv("OLLAMA_MODEL"),
                stream=True,
                user_id=user_name
            )
            
            try:
                for chunk in completion:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        print(content, end="", flush=True)
                        yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
                    elif chunk.choices[0].finish_reason == "stop":
                        yield f"data: [DONE]\n\n"
                        break
            finally:
                await asyncio.sleep(0.1)
                backend_instance.client.flush(user_name)
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TTSRequest(BaseModel):
    message: str

def clean_text_for_tts(text: str) -> str:
    """
    Clean text by removing emojis, special characters, and normalizing whitespace.
    Keep only basic punctuation and Italian accented characters.
    """
    # Define allowed characters (Italian alphabet, numbers, basic punctuation)
    allowed_chars = (
        "abcdefghijklmnopqrstuvwxyz"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789"
        "àèéìíîòóùú"
        "ÀÈÉÌÍÎÒÓÙÚ"
        ".,!?-' "
    )
    
    # Normalize unicode characters (e.g., convert 'è' to 'e')
    text = unicodedata.normalize('NFKC', text)
    
    # Remove emojis and other special characters
    text = ''.join(c for c in text if c in allowed_chars)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text.strip()

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    try:
        # Clean the text before sending to TTS
        cleaned_text = clean_text_for_tts(request.message)
        print(f"Original text: {request.message}")
        print(f"Cleaned text: {cleaned_text}")
        
        # Generate speech using OpenAI TTS with the correct client
        response = backend_instance.tts_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=cleaned_text,
            response_format="mp3"
        )
        
        # Convert to base64 for sending to frontend
        audio_base64 = base64.b64encode(response.content).decode()
        
        return {"audio": audio_base64}
    except Exception as e:
        print(f"Error in TTS endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000)