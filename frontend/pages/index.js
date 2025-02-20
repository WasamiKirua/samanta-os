import { useState } from 'react';
import Head from 'next/head';
import OpeningAnimation from '../components/OpeningAnimation';
import AudioTranscriber from '../components/AudioTranscriber';

export default function Home() {
  const [showAnimation, setShowAnimation] = useState(true);
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <Head>
        <title>Project Human</title>
        <meta name="description" content="Next-generation AI Assistant" />
        <link rel="icon" href="/icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </Head>
      <div 
        className={`min-h-screen transition-all duration-500 ${
          theme === 'light' 
            ? 'bg-gradient-to-br from-purple-50 to-pink-50' 
            : 'bg-gradient-to-br from-gray-900 to-purple-900'
        }`}
      >
        {showAnimation && (
          <OpeningAnimation onComplete={() => setShowAnimation(false)} />
        )}
        
        {!showAnimation && (
          <div className="relative flex flex-col min-h-screen">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={toggleTheme}
                className={`
                  px-4 py-2 rounded-full shadow-lg 
                  transition-all duration-300 
                  hover:shadow-xl hover:scale-105
                  ${theme === 'light' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'bg-gradient-to-r from-purple-400 to-pink-400 text-gray-900'
                  }
                `}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-4">
              {/* Subtle Tagline */}
              <div className={`
                mb-8 text-center
                ${theme === 'light' ? 'text-purple-900' : 'text-purple-200'}
              `}>
                <p className="text-lg font-light tracking-wider" style={{ fontFamily: "'Raleway', sans-serif" }}>
                  Ai Like Me
                </p>
                <div className="mt-2 flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full animate-pulse bg-purple-500" />
                  <p className="text-sm font-light tracking-widest">READY</p>
                </div>
              </div>

              {/* Transcription Area */}
              <div className="w-full max-w-2xl">
                <AudioTranscriber theme={theme} />
              </div>
            </main>

            {/* Footer */}
            <footer className={`
              py-8 text-center text-sm font-light tracking-wider
              ${theme === 'light' ? 'text-purple-700' : 'text-purple-300'}
            `}>
              <p style={{ fontFamily: "'Raleway', sans-serif" }}>
                Powered by WhisperX
              </p>
            </footer>
          </div>
        )}
      </div>
    </>
  );
}