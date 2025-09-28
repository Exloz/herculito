// Timer Web Worker for background execution
let timerInterval = null;
let timeLeft = 0;
let initialTime = 0;
let startTime = null;
let isActive = false;

// Listen for messages from main thread
self.onmessage = function(e) {
  const { type, seconds, action } = e.data;

  if (type === 'START_TIMER' && seconds > 0) {
    initialTime = seconds;
    timeLeft = seconds;
    startTime = Date.now();
    isActive = true;

    if (timerInterval) {
      clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
      if (!isActive) return;

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timeLeft = Math.max(0, initialTime - elapsed);

      // Send time update to main thread
      self.postMessage({
        type: 'TIME_UPDATE',
        timeLeft,
        isActive: timeLeft > 0
      });

      if (timeLeft === 0) {
        isActive = false;
        self.postMessage({
          type: 'TIMER_FINISHED'
        });
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }, 1000);

  } else if (action === 'PAUSE') {
    isActive = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

  } else if (action === 'RESET') {
    isActive = false;
    timeLeft = 0;
    initialTime = 0;
    startTime = null;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    self.postMessage({
      type: 'RESET_COMPLETE'
    });
  }
};