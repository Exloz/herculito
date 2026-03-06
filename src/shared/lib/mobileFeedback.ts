const canUseVibration = (): boolean => {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
};

export const vibrateLight = (): void => {
  if (!canUseVibration()) return;
  navigator.vibrate(10);
};

export const vibrateSuccess = (): void => {
  if (!canUseVibration()) return;
  navigator.vibrate([12, 30, 18]);
};
