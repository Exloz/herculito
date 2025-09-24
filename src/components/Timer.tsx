import React from 'react';
import { Timer as TimerIcon, X, Pause, Play } from 'lucide-react';
import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  onClose: () => void;
}

export const Timer: React.FC<TimerProps> = ({ onClose }) => {
  const { timeLeft, isActive, progress, startTimer, pauseTimer, resetTimer, formatTime } = useTimer();

  const quickTimerButtons = [60, 90, 120, 180];

  if (timeLeft === 0 && !isActive) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700 z-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TimerIcon className="text-blue-400" size={20} />
            <span className="text-white font-medium">Temporizador de Descanso</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickTimerButtons.map(seconds => (
            <button
              key={seconds}
              onClick={() => startTimer(seconds)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium"
            >
              {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>
    );
  }

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