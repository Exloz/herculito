// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseSelector } from './ExerciseSelector';

const mocks = vi.hoisted(() => ({
  incrementUsage: vi.fn(),
  onSelectExercise: vi.fn()
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}));

vi.mock('../hooks/useExerciseTemplates', () => ({
  useExerciseTemplates: () => ({
    exercises: [{
      id: 'exercise-1',
      name: 'Press de banca',
      category: 'Pecho',
      sets: 3,
      reps: 10,
      restTime: 90,
      createdBy: 'user-1',
      isPublic: true,
      createdAt: new Date(0),
      timesUsed: 2
    }],
    loading: false,
    createExerciseTemplate: vi.fn(),
    updateExerciseTemplate: vi.fn(),
    incrementUsage: mocks.incrementUsage,
    getCategories: () => ['Pecho'],
    searchExercises: () => [{
      id: 'exercise-1',
      name: 'Press de banca',
      category: 'Pecho',
      sets: 3,
      reps: 10,
      restTime: 90,
      createdBy: 'user-1',
      isPublic: true,
      createdAt: new Date(0),
      timesUsed: 2
    }]
  })
}));

vi.mock('../hooks/useExerciseVideoManager', () => ({
  useExerciseVideoManager: () => ({
    videoSuggestions: [],
    videoLoading: false,
    videoError: '',
    selectedVideo: null,
    setSelectedVideo: vi.fn(),
    backfillRunning: false,
    backfillMessage: '',
    ownVideoCandidates: 0,
    clearVideoSelection: vi.fn(),
    handleSuggestVideos: vi.fn(),
    handlePickSuggestion: vi.fn(),
    handleBackfillVideos: vi.fn()
  })
}));

vi.mock('../../../shared/hooks/useDialogA11y', () => ({
  useDialogA11y: vi.fn()
}));

vi.mock('../../../shared/hooks/useDialogViewport', () => ({
  useDialogViewport: () => ({ backdropStyle: {}, panelStyle: {} })
}));

describe('ExerciseSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.incrementUsage.mockReturnValue(new Promise(() => {}));
  });

  it('selects immediately without waiting for usage tracking', () => {
    render(
      <ExerciseSelector
        onSelectExercise={mocks.onSelectExercise}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Press de banca/i }));

    expect(mocks.onSelectExercise).toHaveBeenCalledWith({
      id: 'exercise-1',
      name: 'Press de banca',
      sets: 3,
      reps: 10,
      restTime: 90
    });
    expect(mocks.incrementUsage).toHaveBeenCalledWith('exercise-1');
  });
});
