import { useEffect, useRef, useState } from 'react';

export default function AudioTranscriber() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder instance
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm',  // This format works well with WhisperX
      });

      // Handle data available event
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendToWhisperX(audioBlob);
        chunksRef.current = [];
      };

      // Start recording
      mediaRecorderRef.current.start(5000); // Collect data every 5 seconds
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendToWhisperX = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);

      // Update to match your backend endpoint
      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      // Update to match your backend response structure
      setTranscript(prev => prev + ' ' + result.transcription);
    } catch (error) {
      console.error('Error sending to WhisperX:', error);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      <div className="p-4 border rounded min-h-[200px] bg-white shadow">
        <h3 className="font-bold mb-2">Transcript:</h3>
        <p className="whitespace-pre-wrap">{transcript}</p>
      </div>
    </div>
  );
} 