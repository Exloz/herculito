import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Target } from 'lucide-react';
import type { ArcheryRound } from '../../../../shared/types';
import { EndInput } from './EndInput';

interface RoundCardProps {
  round: ArcheryRound;
  isActive: boolean;
  onAddEnd: (roundId: string, arrows: { score: number; isGold: boolean }[]) => Promise<void> | void;
  disabled?: boolean;
}

export const RoundCard: React.FC<RoundCardProps> = ({
  round,
  isActive,
  onAddEnd,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [showEndInput, setShowEndInput] = useState(false);

  const handleAddEnd = async (arrows: { score: number; isGold: boolean }[]) => {
    await onAddEnd(round.id, arrows);
    setShowEndInput(false);
  };

  return (
    <div className={`app-card ${isActive ? 'border-mint/40' : ''}`}>
      {/* Round Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between"
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isActive ? 'bg-mint/15 text-mint' : 'bg-slateDeep text-slate-400'
          }`}>
            <Target size={20} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">
              Ronda {round.order}: {round.distance}m
            </div>
            <div className="text-xs text-slate-400">
              Blanco {round.targetSize}cm • {round.arrowsPerEnd} flechas/tanda
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-display font-bold text-white">
              {round.totalScore}
            </div>
            <div className="text-xs text-slate-400">
              {round.ends.length} tandas
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-mist/30 pt-4">
          {/* Ends List */}
          {round.ends.length > 0 && (
            <div className="space-y-2 mb-4">
              {round.ends.map((end) => (
                <div
                  key={end.id}
                  className="flex items-center justify-between bg-slateDeep/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Tanda {end.endNumber}</span>
                    <div className="flex gap-1">
                      {end.arrows.map((arrow, arrowIndex) => (
                        <span
                          key={arrowIndex}
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold ${
                            arrow.isGold
                              ? 'bg-amberGlow/20 text-amberGlow'
                              : 'bg-graphite text-slate-300'
                          }`}
                        >
                          {arrow.isGold ? 'X' : arrow.score}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-white font-semibold">{end.subtotal}</span>
                    {end.goldCount > 0 && (
                      <span className="ml-2 text-amberGlow text-xs">{end.goldCount}O</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add End Button or Input */}
          {isActive && !showEndInput && (
            <button
              type="button"
              onClick={() => setShowEndInput(true)}
              disabled={disabled}
              className="w-full btn-secondary inline-flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Agregar tanda</span>
            </button>
          )}

          {isActive && showEndInput && (
            <div className="bg-slateDeep/30 rounded-xl p-4">
              <div className="text-sm font-medium text-white mb-3">
                Nueva tanda
              </div>
              <EndInput
                arrowsPerEnd={round.arrowsPerEnd}
                onComplete={handleAddEnd}
                onCancel={() => setShowEndInput(false)}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
