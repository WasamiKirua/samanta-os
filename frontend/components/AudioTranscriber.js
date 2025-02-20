import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';

export default function AudioTranscriber({ theme }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const isListeningRef = useRef(false);
  const audioRef = useRef(new Audio());

  // Tunable parameters
  const SILENCE_THRESHOLD = 0.015;        // Increased sensitivity
  const SILENCE_DURATION = 2000;          // Increase to 2 seconds
  const MIN_RECORDING_TIME = 1500;        // Increase to 1.5 seconds
  const START_RECORDING_DELAY = 500;      // Add 500ms delay before processing

  // Define maximum number of turns to keep (1 turn = user message + assistant response)
  const MAX_TURNS = 2;

  const startRecording = async () => {
    try {
      console.log("1. Starting recording process...");
      
      // Clear previous transcript when starting new recording
      setTranscript('');
      
      // Reset state
      isListeningRef.current = true;
      isProcessingRef.current = false;
      chunksRef.current = [];

      // First create AudioContext to get system sample rate
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const systemSampleRate = audioContextRef.current.sampleRate;
      
      // Get audio stream with system sample rate
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,          // Mono audio
          sampleRate: systemSampleRate,  // Use system sample rate
          sampleSize: 16,           // 16-bit audio
          echoCancellation: true,   // Enable echo cancellation
          noiseSuppression: true,   // Enable noise suppression
        } 
      });
      streamRef.current = stream;
      console.log("2. Got audio stream with sample rate:", systemSampleRate);

      // Create MediaStreamSource with existing AudioContext
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      console.log("3. Audio context and analyzer setup complete");

      // Create and configure MediaRecorder with WebM
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 256000,
      });
      console.log("4. MediaRecorder created");

      // Handle data available
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("5. Received audio chunk, size:", event.data.size);
        }
      };

      // Start recording
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      console.log("6. Recording started");

      // Add a small delay before starting to process audio
      setTimeout(() => {
        // Start monitoring audio levels
        detectSilence();
        console.log("7. Silence detection started after delay");
      }, START_RECORDING_DELAY);

    } catch (error) {
      console.error('Error in startRecording:', error);
      isListeningRef.current = false;
      setIsRecording(false);
      
      // Cleanup on error
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const detectSilence = () => {
    console.log("8. Setting up silence detection");
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let startTime = Date.now();

    const checkAudioLevel = () => {
      if (!isListeningRef.current) {
        console.log("Listening stopped, ending silence detection");
        return;
      }

      try {
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        
        // Calculate RMS value
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = (dataArray[i] - 128) / 128;
          sum += amplitude * amplitude;
        }
        
        const rms = Math.sqrt(sum / bufferLength);
        
        // Debug log for audio levels
        if (rms > 0.01) {
          console.log("Current RMS:", rms.toFixed(4));
        }
        
        if (rms < SILENCE_THRESHOLD) {
          // If we're in silence, start/continue the silence timeout
          if (!silenceTimeoutRef.current && !isProcessingRef.current) {
            console.log("9. Silence detected, starting timeout");
            silenceTimeoutRef.current = setTimeout(() => {
              const recordingDuration = Date.now() - startTime;
              console.log("10. Silence timeout reached, duration:", recordingDuration);
              if (recordingDuration > MIN_RECORDING_TIME) {
                handleSilenceDetected();
              }
            }, SILENCE_DURATION);
          }
        } else {
          // If we detect sound, clear the silence timeout
          if (silenceTimeoutRef.current) {
            console.log("11. Sound detected, clearing silence timeout");
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
            startTime = Date.now(); // Reset start time when new sound is detected
          }
        }

        // Continue the loop
        if (isListeningRef.current) {
          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        }
      } catch (error) {
        console.error("Error in checkAudioLevel:", error);
        if (isListeningRef.current) {
          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        }
      }
    };

    // Start the audio level checking loop
    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  };

  const handleSilenceDetected = async () => {
    if (isProcessingRef.current || chunksRef.current.length === 0) return;
    
    // Check if we have enough audio data
    const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
    if (totalSize < 1000) { // Minimum 1KB of audio data
      console.log("Not enough audio data collected, continuing recording");
      return;
    }
    
    console.log("12. Processing audio chunks...");
    isProcessingRef.current = true;

    try {
      // Store current chunks
      const currentChunks = [...chunksRef.current];
      chunksRef.current = [];

      // Stop current recording and wait for it to fully stop
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        await new Promise((resolve) => {
          // Wait for the final dataavailable event
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              currentChunks.push(event.data);
            }
            resolve();
          };
          mediaRecorderRef.current.stop();
        });
      }

      const audioBlob = new Blob(currentChunks, { 
        type: 'audio/webm; codecs=opus'  // Explicitly specify codec
      });
      console.log("13. Created audio blob, size:", audioBlob.size);

      if (audioBlob.size > 0) {
        await sendToWhisperX(audioBlob);
        
        // Create a new MediaRecorder instance
        if (isListeningRef.current && streamRef.current) {
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: 'audio/webm; codecs=opus',
            audioBitsPerSecond: 128000  // Reduced bitrate for better compatibility
          });

          // Set up the data handler before starting
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
              console.log("Received new chunk, size:", event.data.size);
            }
          };

          // Start the new recording
          mediaRecorderRef.current.start(1000);
          console.log("14. Started new recording segment");
        }
      }
    } catch (error) {
      console.error("Error in handleSilenceDetected:", error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const stopRecording = () => {
    isListeningRef.current = false;
    setIsRecording(false);
    cleanup();
    console.log("Recording stopped");
  };

  const sendToWhisperX = async (audioBlob) => {
    try {
      console.log("Sending audio for transcription...");
      const formData = new FormData();
      formData.append('file', audioBlob);

      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Only log the error, don't add it to conversation
        console.log("Transcription error:", errorData.detail);
        return;
      }

      const result = await response.json();
      const userMessage = result.transcription;
      
      if (!userMessage || userMessage.trim() === '') {
        console.log("Empty transcription received, skipping LLM call");
        return;
      }
      
      // Add user message and maintain conversation history
      setConversation(prev => {
        const newConversation = [...prev, { role: 'user', content: userMessage }];
        return newConversation.slice(-MAX_TURNS * 2);
      });
      
      // Get LLM response
      await getLLMResponse(userMessage);
      
    } catch (error) {
      console.error('Error sending to WhisperX:', error);
      // Only log the error, don't add it to conversation
    }
  };

  const playTTSAudio = async (text) => {
    try {
      console.log("Getting TTS audio for:", text);
      const response = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('TTS error:', errorData);
        throw new Error(errorData.detail || 'TTS request failed');
      }

      const data = await response.json();
      
      if (!data.audio) {
        throw new Error('No audio data received');
      }
      
      // Convert base64 to audio
      const audioBlob = await fetch(`data:audio/wav;base64,${data.audio}`).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio and wait for it to finish
      return new Promise((resolve) => {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audioRef.current.play().catch(error => {
          console.error('Audio play error:', error);
          resolve();
        });
      });
    } catch (error) {
      console.error('Error playing TTS:', error);
      // Continue with showing the text even if TTS fails
      return Promise.resolve();
    }
  };

  const getLLMResponse = async (message) => {
    try {
        const userId = process.env.REACT_APP_USER_NAME; // Access the user name from environment variables
        console.log("Sending message to LLM:", message);
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                user_id: userId // Use the user ID from the environment variable
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Chat failed');
        }

        let assistantMessage = { role: 'assistant', content: '' };
        let fullResponse = '';
        
        // Create a new ReadableStream from the response
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = value.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        if (line.includes('[DONE]')) {
                            console.log("LLM response completed");
                            // Play TTS first, then show the message
                            await playTTSAudio(fullResponse);
                            setConversation(prev => {
                                const newConversation = [
                                    ...prev,
                                    { role: 'assistant', content: fullResponse }
                                ];
                                return newConversation.slice(-MAX_TURNS * 2);
                            });
                            return;
                        }

                        const data = JSON.parse(line.slice(6));
                        if (data.choices[0].delta.content) {
                            fullResponse += data.choices[0].delta.content;
                        }
                    } catch (parseError) {
                        console.error('Error parsing chunk:', parseError, 'Line:', line);
                        continue;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in getLLMResponse:', error);
        setConversation(prev => {
            const newConversation = [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error while processing your message.'
            }];
            return newConversation.slice(-MAX_TURNS * 2);
        });
    }
};

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      stopRecording();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Also add a cleanup function to properly stop recording
  const cleanup = () => {
    console.log("Cleaning up resources...");
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Clear refs
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    
    // Clear timeouts and animation frames
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Add cleanup to useEffect
  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div className={`
        w-full mb-8 p-6 rounded-2xl shadow-lg backdrop-blur-sm
        transition-all duration-300
        ${theme === 'light' 
          ? 'bg-white/80 text-purple-900 shadow-purple-100' 
          : 'bg-gray-800/80 text-purple-100 shadow-purple-900/20'
        }
      `}>
        <div className="min-h-[200px] whitespace-pre-wrap space-y-4">
          {conversation.length > 0 ? (
            conversation.map((message, index) => (
              <div key={index} className="mb-4">
                <span className="font-semibold">
                  {message.role === 'user' ? 'You: ' : 'Samanta: '}
                </span>
                <span>{message.content}</span>
              </div>
            ))
          ) : (
            <span className="text-opacity-60 italic">
              {isRecording ? "Listening..." : "Your conversation will appear here..."}
            </span>
          )}
        </div>
      </div>

      {/* Speak Button with Enhanced Feedback */}
      <div className="fixed bottom-16 flex flex-col items-center">
        {/* Ripple effect when recording */}
        {isRecording && (
          <>
            <div className="absolute -inset-4 rounded-full animate-ripple-fast bg-purple-500/20" />
            <div className="absolute -inset-8 rounded-full animate-ripple-slow bg-purple-500/10" />
          </>
        )}
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            relative
            w-16 h-16
            flex items-center justify-center
            rounded-full
            transition-all duration-300
            hover:scale-110
            ${isRecording 
              ? theme === 'light'
                ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50'
                : 'bg-gradient-to-r from-red-400 to-pink-400 shadow-red-500/30'
              : theme === 'light'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg hover:shadow-xl'
                : 'bg-gradient-to-r from-purple-400 to-pink-400 shadow-purple-500/30'
            }
          `}
        >
          <Image 
            src="/mic.png" 
            alt={isRecording ? "Stop Recording" : "Start Recording"} 
            width={24} 
            height={24}
            className={`
              transition-all duration-300
              ${isRecording ? 'scale-90 animate-pulse' : 'scale-100'}
            `}
          />
        </button>
        
        {/* Recording status text */}
        <div className={`
          mt-4 text-sm font-light
          transition-all duration-300
          ${isRecording ? 'opacity-100' : 'opacity-0'}
          ${theme === 'light' ? 'text-purple-900' : 'text-purple-200'}
        `}>
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Listening...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 