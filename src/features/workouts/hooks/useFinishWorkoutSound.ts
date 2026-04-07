import { useCallback } from 'react';

const FINISH_SOUND_PROBABILITY = 0.15;

export const useFinishWorkoutSound = () => {
  const playFinishSound = useCallback(() => {
    if (Math.random() < FINISH_SOUND_PROBABILITY) {
      const audio = new Audio('/sounds/finish-sound.mp3');
      audio.play().catch(console.error);
    }
  }, []);

  return { playFinishSound };
};
