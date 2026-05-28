import { useState, useEffect } from 'react';
import { X, User, Mail, Sparkles, Loader2, Lock, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface ProfileSettingsModalProps {
  user: any;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export function ProfileSettingsModal({ user, onClose, onProfileUpdated }: ProfileSettingsModalProps) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim()
        }
      });

      if (updateError) throw updateError;

      setSuccessMsg('Profile synergy synchronized successfully!');
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      console.error('Failed to update profile settings:', err);
      setError(err.message || 'Failed to update user profile metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md liquid-glass rounded-2xl sm:rounded-3xl border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col bg-black/85 cursor-default p-4 sm:p-6 md:p-8"
      >
        {/* Decorative Glow Elements - GPU-native radial glows */}
        <div 
          className="absolute -top-32 -left-32 w-72 h-72 rounded-full mix-blend-screen animate-pulse-slow pointer-events-none bg-radial-glow-cyan opacity-80"
        />
        <div 
          className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full mix-blend-screen animate-pulse-slow pointer-events-none bg-radial-glow-purple opacity-80"
        />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between pb-5 border-b border-white/5 select-none z-10">
          <div className="flex items-center space-x-3 select-none">
            <User className="w-5 h-5 text-accent-cyan animate-pulse" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-heading italic text-white font-light tracking-tight">
              Synergy Profile
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/40 rounded-full hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="relative z-10 mt-6 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            {error && (
              <div className="p-3 text-[10px] uppercase tracking-wider font-semibold rounded-full border border-accent-orange/20 bg-accent-orange/10 text-accent-orange pl-5">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-[10px] uppercase tracking-wider font-semibold rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 pl-5">
                {successMsg}
              </div>
            )}

            {/* Email Field (Locked/Disabled) */}
            <div className="space-y-2">
              <label className="text-[9px] font-body font-semibold tracking-wider text-white/40 uppercase pl-1 select-none flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Registered Email
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-5 pr-12 py-3.5 bg-white/[0.02] border border-white/5 rounded-full text-white/40 text-xs font-body font-light tracking-wide outline-none select-none cursor-not-allowed"
                />
                <div className="absolute right-4 text-white/20 select-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Username / Display Name Field */}
            <div className="space-y-2">
              <label className="text-[9px] font-body font-semibold tracking-wider text-white/40 uppercase pl-1 select-none flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-accent-cyan" /> Custom Display Name
              </label>
              <input
                type="text"
                required
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-5 pr-5 py-3.5 bg-white/[0.01] border border-white/5 focus:border-accent-cyan/40 focus:bg-white/[0.03] outline-none text-white text-xs font-body font-light tracking-wide rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 sm:pt-6 border-t border-white/5 flex items-center justify-end gap-3 mt-6 sm:mt-8 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-white/5 hover:border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5 font-body text-[10px] uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !displayName.trim()}
              className="px-7 py-2.5 rounded-full text-black font-semibold font-body text-[10px] uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer disabled:opacity-50 border-none flex items-center space-x-1.5"
              style={{ 
                backgroundColor: displayName.trim() ? '#00f2fe' : '#333333',
                boxShadow: displayName.trim() ? '0 0 20px rgba(0, 242, 254, 0.2)' : 'none'
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Synergy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
