import { useEffect, useState } from 'react';

export default function OpeningAnimation({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [showText, setShowText] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    // Sequence the animations
    const textTimer = setTimeout(() => setShowText(true), 1000);
    const secondaryTimer = setTimeout(() => setShowSecondary(true), 2000);
    const completionTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(secondaryTimer);
      clearTimeout(completionTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="text-center">
        {/* Main pulsing circle */}
        <div className="relative w-32 h-32 mb-12">
          <div className="absolute inset-0 rounded-full animate-pulse-ring bg-gradient-to-r from-purple-500 to-pink-500 opacity-75" />
          <div className="absolute inset-6 rounded-full animate-pulse-core bg-gradient-to-r from-purple-400 to-pink-400" />
          
          {/* Orbital circles */}
          <div className="absolute inset-0 animate-orbit">
            <div className="absolute -top-2 left-1/2 w-4 h-4 -ml-2 rounded-full bg-purple-400 animate-pulse-small" />
          </div>
          <div className="absolute inset-0 animate-orbit-reverse">
            <div className="absolute -bottom-2 left-1/2 w-3 h-3 -ml-1.5 rounded-full bg-pink-400 animate-pulse-small" />
          </div>
        </div>

        {/* Main text */}
        <div className={`transform transition-all duration-1000 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-white text-4xl font-light tracking-widest mb-4" style={{ fontFamily: "'Raleway', sans-serif" }}>
            Hello
          </p>
        </div>

        {/* Secondary text */}
        <div className={`transform transition-all duration-1000 ${showSecondary ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-gray-400 text-xl font-light tracking-wider" style={{ fontFamily: "'Raleway', sans-serif" }}>
            I'm Samanta
          </p>
        </div>
      </div>
    </div>
  );
} 