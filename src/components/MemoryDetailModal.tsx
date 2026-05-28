import { useState, useEffect } from 'react';
import { X, Calendar, Sparkles, Trash2, Eye } from 'lucide-react';
import type { Memory } from '../hooks/useMemories';

export interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

export function MemoryDetailModal({ memory, onClose, onDelete }: MemoryDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset internal deletion states when a different memory crystal is selected
  useEffect(() => {
    setIsDeleting(false);
    setConfirmDelete(false);
    setError(null);
  }, [memory?.id]);

  // Escape key closing handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!memory) return null;

  const { parsed, image_url, date, id } = memory;
  const { title, content, category, color } = parsed;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      setError(err.message || 'Failed to dissolve memory.');
      setIsDeleting(false);
      setConfirmDelete(false); // clear confirm prompt to let them see error
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in cursor-pointer"
    >
      {/* Background Interactive Aura */}
      <div 
        className="absolute inset-0 w-full h-full opacity-15 blur-[120px] pointer-events-none transition-all duration-700 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)`
        }}
      />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl md:max-w-3xl liquid-glass rounded-2xl sm:rounded-3xl border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden max-h-[92vh] flex flex-col md:flex-row bg-black/80 cursor-default"
      >
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-white/40 bg-white/5 backdrop-blur-md rounded-full hover:text-white hover:bg-white/15 border border-white/5 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media / Image Column */}
        {image_url && (
          <div className="relative w-full md:w-1/2 h-48 sm:h-56 md:h-auto overflow-hidden bg-black/40">
            <img 
              src={image_url} 
              alt={title} 
              className="w-full h-full object-cover animate-pulse-slow"
              style={{ animationDuration: '8s' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/20 to-transparent" />
            
            {/* Visual Indicators */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
              <Eye className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-[9px] uppercase tracking-[0.15em] text-white/70 font-semibold select-none">
                Zero Gravity Node
              </span>
            </div>
          </div>
        )}

        {/* Content Column */}
        <div className={`flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between ${image_url ? 'w-full md:w-1/2' : 'w-full'}`}>
          <div className="space-y-6">
            
            {/* Header / Category Badge */}
            <div className="flex items-center justify-between">
              <span 
                className="px-3 py-0.5 text-[9px] font-bold rounded-full border shadow-[0_0_15px_rgba(255,255,255,0.05)] uppercase tracking-wider"
                style={{ 
                  borderColor: `${color}40`,
                  color: color,
                  backgroundColor: `${color}20`
                }}
              >
                {category}
              </span>
              
              <div className="flex items-center text-white/30 text-xs font-light select-none">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                <span>{new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 select-none">
                <Sparkles className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30 font-body">Crystallized Moment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading italic text-white leading-none font-light tracking-tight select-text">
                {title}
              </h1>
            </div>

            {/* Description / Content */}
            <div className="max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar select-text">
              <p className="text-white/60 leading-relaxed font-body text-xs md:text-sm font-light whitespace-pre-wrap">
                {content}
              </p>
            </div>

            {/* Custom tags list */}
            {parsed.tags && parsed.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 select-none">
                {parsed.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="px-2.5 py-0.5 rounded-full text-[9px] font-body bg-white/5 border border-white/5 text-white/50 shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions / Delete Option */}
          {onDelete && (
            <div className="pt-4 sm:pt-5 border-t border-white/5 flex flex-col space-y-3 mt-4 sm:mt-6 bg-white/[0.01] -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-6">
              {error && (
                <div className="flex items-center space-x-2 text-[10px] bg-accent-orange/10 border border-accent-orange/20 text-accent-orange p-2.5 rounded-xl animate-fade-in font-body">
                  <span className="font-semibold uppercase tracking-wider">Error:</span>
                  <span>{error}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(true);
                      setError(null); // Clear error on retry
                    }}
                    className="flex items-center space-x-1.5 text-[9px] uppercase tracking-widest text-white/30 hover:text-accent-orange transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dissolve memory</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full justify-between select-none">
                    <span className="text-[9px] uppercase tracking-wider text-accent-orange font-semibold">Dissolve this memory forever?</span>
                    <div className="flex gap-2">
                      <button
                        key="cancel"
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-4 py-1.5 rounded-full border border-white/5 text-white/60 hover:text-white hover:bg-white/5 font-body text-[9px] uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        key="confirm"
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="px-4 py-1.5 rounded-full bg-accent-orange/15 hover:bg-accent-orange/30 text-accent-orange hover:text-white border border-accent-orange/20 font-body text-[9px] uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        {isDeleting ? 'Dissolving...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
