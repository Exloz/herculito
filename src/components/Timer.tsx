 import React, { useEffect, useRef } from 'react';
import { Timer as TimerIcon, X, Pause, Play } from 'lucide-react';
import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  onClose: () => void;
  initialSeconds?: number;
}

export const Timer: React.FC<TimerProps> = ({ onClose, initialSeconds }) => {
  const { timeLeft, isActive, progress, startTimer, pauseTimer, resetTimer, formatTime } = useTimer();
  const startTimeRef = useRef<number | null>(null);

  // Track when timer was started
  useEffect(() => {
    if (initialSeconds && initialSeconds > 0 && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  }, [initialSeconds]);

   // Start timer with initial seconds when component mounts
   useEffect(() => {
     if (initialSeconds && initialSeconds > 0) {
       startTimer(initialSeconds);
     }
   }, [initialSeconds, startTimer]);

  // Close timer when it finishes
  useEffect(() => {
    // Only close if timer has actually finished and has been running for at least 1 second
    if (timeLeft === 0 && !isActive && startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > 1000) { // At least 1 second has passed
        onClose();
      }
    }
  }, [timeLeft, isActive, onClose]);

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TimerIcon className="text-green-400" size={20} />
          <span className="text-white font-medium">Descanso</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      
      <div className="text-center mb-3">
        <div className="text-2xl font-bold text-white">{formatTime()}</div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex space-x-2 justify-center">
        <button
          onClick={isActive ? pauseTimer : () => startTimer(timeLeft)}
          className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors"
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          <span>{isActive ? 'Pausar' : 'Reanudar'}</span>
        </button>
        <button
          onClick={resetTimer}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};