import React, { useState, useRef } from 'react';
import Image from 'next/image';

function AudioRecorder({ theme }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const autoStopTriggeredRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceDurationRef = useRef(0); // in seconds
  // Use a ref to have the latest recording status within our interval function.
  const isRecordingRef = useRef(false);

  // --- Tune these values ---
  const SILENCE_THRESHOLD = 0.02; // RMS value below which audio is considered "silent"
  const SILENCE_DURATION = 1.0;   // seconds of continuous silence required to trigger auto-stop

  const startRecording = async () => {
    try {
      // Request audio stream from user's mic.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configure MediaRecorder options.
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Reset our data and flags.
      audioChunksRef.current = [];
      autoStopTriggeredRef.current = false;
      silenceDurationRef.current = 0;
      isRecordingRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Assemble the recorded audio into a Blob.
        const blob = new Blob(audioChunksRef.current, {
          type: options.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        
        // Clear the silence-detection interval.
        if (silenceTimerRef.current) {
          clearInterval(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        
        // If auto-stop was triggered by silence, immediately send the blob for transcription.
        if (autoStopTriggeredRef.current) {
          sendForTranscription(blob);
        }
      };

      // Start recording.
      mediaRecorder.start();
      setRecording(true);

      // Setup Web Audio API for continuous volume detection.
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      // Start an interval to check the RMS (volume level) every 100ms.
      silenceTimerRef.current = setInterval(() => {
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Compute the root mean square (RMS) of the samples.
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 128 - 1; // Normalize to range [-1, 1]
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        // If rms is below our threshold, accumulate silence time.
        if (rms < SILENCE_THRESHOLD) {
          silenceDurationRef.current += 0.1; // roughly matching our 100ms interval
        } else {
          // Reset if any sound is detected.
          silenceDurationRef.current = 0;
        }

        // If silence has persisted long enough, auto-stop the recording.
        if (silenceDurationRef.current >= SILENCE_DURATION && isRecordingRef.current) {
          console.log("Silence detected for", silenceDurationRef.current, "seconds. Auto-stopping recording.");
          autoStopTriggeredRef.current = true;
          stopRecording();
        }
      }, 100); // checking every 100 ms

    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      isRecordingRef.current = false;

      // Close the AudioContext to free up resources.
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const sendForTranscription = async (blob) => {
    if (!blob) return;
    
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');
    
    try {
      console.log('Sending audio for transcription...');
      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('Raw response:', data);
      console.log('Transcription result:', data.transcription);
    } catch (err) {
      console.error('Error sending audio for transcription:', err);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`w-16 h-16 flex items-center justify-center rounded-full hover:scale-105 transition-transform shadow-lg ${
          theme === 'light' ? 'bg-indigo-500' : 'bg-teal-500'
        }`}
      >
        <Image 
          src="/mic.png" 
          alt={recording ? "Stop Recording" : "Start Recording"} 
          width={24} 
          height={24} 
        />
      </button>
      <p className={`mt-2 text-xs ${theme === 'light' ? 'text-gray-900' : 'text-gray-200'}`}>
        {recording ? "Recording... Speak now!" : "Tap to talk"}
      </p>
    </div>
  );
}

export default AudioRecorder; 