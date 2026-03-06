import React from 'react';
import { Check, Loader, Play } from 'lucide-react';
import type { ExerciseVideo } from '../../../shared/types';
import type { MusclewikiSuggestion } from '../api/musclewikiApi';
import { getVideoPreviewUrls } from '../lib/exerciseVideo';

interface ExerciseVideoPickerProps {
  exerciseName: string;
  videoError: string;
  videoLoading: boolean;
  videoSuggestions: MusclewikiSuggestion[];
  selectedVideo: ExerciseVideo | null;
  onSuggestVideos: () => void;
  onPickSuggestion: (suggestion: MusclewikiSuggestion) => void;
  onClearVideo: () => void;
}

export const ExerciseVideoPicker: React.FC<ExerciseVideoPickerProps> = ({
  exerciseName,
  videoError,
  videoLoading,
  videoSuggestions,
  selectedVideo,
  onSuggestVideos,
  onPickSuggestion,
  onClearVideo
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-slate-300">Video (MuscleWiki)</label>
        <button
          type="button"
          onClick={onSuggestVideos}
          disabled={!exerciseName.trim() || videoLoading}
          className="btn-ghost text-xs disabled:opacity-60"
        >
          Buscar sugerencias
        </button>
      </div>

      {videoError && (
        <div className="bg-amberGlow/10 border border-amberGlow/40 rounded-md p-3 text-amberGlow text-xs">
          {videoError}
        </div>
      )}

      {videoLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader size={14} className="animate-spin" />
          <span>Buscando videos...</span>
        </div>
      )}

      {videoSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 mb-1">Selecciona un video de la lista:</div>
          {videoSuggestions.map((suggestion) => {
            const isSelected = selectedVideo?.slug === suggestion.slug;
            return (
              <button
                key={suggestion.slug}
                type="button"
                onClick={() => onPickSuggestion(suggestion)}
                className={`w-full px-3 py-3 rounded-xl text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-mint/20 border-2 border-mint'
                    : 'bg-slateDeep hover:bg-charcoal border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-mint text-ink' : 'bg-charcoal text-slate-400'
                  }`}>
                    {isSelected ? <Check size={16} /> : <Play size={14} />}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-mint' : 'text-white'}`}>
                      {suggestion.displayName}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      Coincidencia: {Math.min(100, Math.round(suggestion.score * 100))}%
                    </div>
                  </div>
                </div>
                {isSelected && <span className="text-xs text-mint font-medium">Seleccionado</span>}
              </button>
            );
          })}
        </div>
      )}

      {selectedVideo && (() => {
        const { frontUrl, sideUrl } = getVideoPreviewUrls(selectedVideo);
        return (
          <div className="bg-mint/10 border-2 border-mint rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-mint">
              <Check size={18} />
              <span className="font-semibold">Video seleccionado</span>
            </div>

            <div className={`grid gap-3 ${sideUrl ? 'sm:grid-cols-2' : ''}`}>
              <div>
                <div className="text-xs text-slate-400 mb-1">Vista frontal</div>
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                  <video className="h-full w-full" src={frontUrl} controls playsInline preload="metadata" />
                </div>
              </div>
              {sideUrl && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Vista lateral</div>
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                    <video className="h-full w-full" src={sideUrl} controls playsInline preload="metadata" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <a
                href={selectedVideo.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-mint hover:text-mintDeep font-medium"
              >
                Abrir en MuscleWiki {'->'}
              </a>
              <button
                type="button"
                onClick={onClearVideo}
                className="text-amberGlow hover:text-amberGlow/80 font-medium"
              >
                Cambiar video
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
