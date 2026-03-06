import { useEffect, useState } from 'react';

export const useDelayedLoading = (isLoading: boolean, delayMs = 160): boolean => {
  const [showLoadingUi, setShowLoadingUi] = useState(false);

  useEffect(() => {
    let timeoutId: number | null = null;

    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        setShowLoadingUi(true);
      }, delayMs);
    } else {
      setShowLoadingUi(false);
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [delayMs, isLoading]);

  return showLoadingUi;
};
