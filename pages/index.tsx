import AudioTranscriber from '../components/AudioTranscriber';

export default function Home() {
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold my-4">Real-time Voice Transcription</h1>
      <AudioTranscriber />
    </div>
  );
} 