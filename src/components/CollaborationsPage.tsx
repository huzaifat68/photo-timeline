import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  Check, 
  X, 
  FolderHeart, 
  Loader2, 
  Send,
  AlertCircle,
  ChevronRight,
  Mail,
  Sparkles,
  Trash2,
  HeartHandshake
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface CollaborationsPageProps {
  friendships: any[];
  sharedFolders: any[];
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  sendFriendRequest: (email: string) => Promise<void>;
  respondToFriendRequest: (id: string, accept: boolean) => Promise<void>;
  currentUserId: string | undefined;
  currentUserEmail: string | undefined;
  onEnterWorkspace: () => void;
}

export function CollaborationsPage({
  friendships,
  sharedFolders,
  activeFolderId,
  setActiveFolderId,
  sendFriendRequest,
  respondToFriendRequest,
  currentUserId,
  currentUserEmail,
  onEnterWorkspace
}: CollaborationsPageProps) {
  const [friendEmail, setFriendEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Cache to map resolved user UUIDs to their emails reactively
  const [resolvedEmails, setResolvedEmails] = useState<Record<string, string>>({});
  
  // Element Refs for GSAP staggered animations
  const pageRef = useRef<HTMLDivElement>(null);
  const inviteFormRef = useRef<HTMLDivElement>(null);
  const activeFoldersRef = useRef<HTMLDivElement>(null);
  const pendingRequestsRef = useRef<HTMLDivElement>(null);
  const activeFriendsRef = useRef<HTMLDivElement>(null);

  // Group friendships into pending & accepted categories
  const incomingPending = friendships.filter(
    (f) => f.status === 'pending' && f.friend_id === currentUserId
  );
  const outgoingPending = friendships.filter(
    (f) => f.status === 'pending' && f.user_id === currentUserId
  );
  const acceptedConnections = friendships.filter(
    (f) => f.status === 'accepted'
  );

  // Resolve emails for UUIDs of all pending requests & friendships using the secure RPC helper
  useEffect(() => {
    if (friendships.length === 0) return;

    const resolveEmailsForRelations = async () => {
      const uidsToResolve = friendships.map(f => f.user_id === currentUserId ? f.friend_id : f.user_id);
      const uniqueUids = Array.from(new Set(uidsToResolve)).filter(Boolean);
      const uidsToFetch = uniqueUids.filter(uid => !resolvedEmails[uid]);
      
      if (uidsToFetch.length === 0) return;

      try {
        const results = await Promise.all(
          uidsToFetch.map(async (uid) => {
            const { data, error } = await supabase.rpc('get_email_by_user_id', { target_uid: uid });
            if (!error && data) {
              return { uid, email: data };
            }
            return { uid, email: null };
          })
        );

        const newResolutions = { ...resolvedEmails };
        let updated = false;
        
        results.forEach(({ uid, email }) => {
          if (email) {
            newResolutions[uid] = email;
            updated = true;
          }
        });

        if (updated) {
          setResolvedEmails(newResolutions);
        }
      } catch (err) {
        console.error('Failed parallel email resolution:', err);
      }
    };

    resolveEmailsForRelations();
  }, [friendships, currentUserId]);

  // GSAP Entrance Animations
  useEffect(() => {
    if (pageRef.current) {
      const ctx = gsap.context(() => {
        // Animation timeline
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        
        // Stagger fade-in components
        tl.fromTo('.collab-header', 
          { y: 30, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 1.2 }
        );

        tl.fromTo([inviteFormRef.current, activeFoldersRef.current, pendingRequestsRef.current, activeFriendsRef.current].filter(Boolean),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.0, stagger: 0.15 },
          '-=0.8'
        );
      }, pageRef.current);

      return () => ctx.revert();
    }
  }, []);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setInviteLoading(true);
    setActionError(null);
    setSuccessMsg(null);
    try {
      await sendFriendRequest(friendEmail.trim());
      setSuccessMsg('Invitation crystallized successfully! Connection pending.');
      setFriendEmail('');
      // Auto clear success message
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to send invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAction = async (id: string, accept: boolean) => {
    setActionLoadingId(id);
    setActionError(null);
    try {
      await respondToFriendRequest(id, accept);
      if (accept) {
        setSuccessMsg('Collaboration fabric fully connected!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to extract email prefix for avatars
  const getEmailPrefix = (email: string) => {
    if (!email) return '?';
    return email.split('@')[0];
  };

  // Helper to extract initials
  const getInitials = (email: string) => {
    const prefix = getEmailPrefix(email);
    if (prefix.length <= 2) return prefix.toUpperCase();
    return (prefix[0] + (prefix[1] || '')).toUpperCase();
  };

  const ownEmailPart = currentUserEmail ? currentUserEmail.split('@')[0] : '';

  return (
    <div ref={pageRef} className="space-y-8 sm:space-y-12 pb-24 md:pb-0">
      {/* 1. Dashboard Header Section */}
      <div className="collab-header flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-white/5 select-none">
        <div className="space-y-3 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02]">
            <HeartHandshake className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/50 font-body">
              Zero-Gravity Synergy Node
            </span>
          </div>
          <h3 className="font-heading italic text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-light leading-none tracking-tight">
            Collaborative Fabrics
          </h3>
          <p className="text-[10px] md:text-xs font-body font-light tracking-[0.25em] text-white/40 uppercase">
            Crystallize shared portals and sync visual timelines in real time
          </p>
        </div>

        {/* Dynamic Stats Capsule */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="liquid-glass px-3 sm:px-4 py-2 rounded-2xl flex flex-col items-center justify-center border border-white/5 w-20 sm:w-24">
            <span className="text-2xl font-body font-semibold text-accent-cyan leading-none">{sharedFolders.length}</span>
            <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40 mt-1 select-none">Fabrics</span>
          </div>
          <div className="liquid-glass px-3 sm:px-4 py-2 rounded-2xl flex flex-col items-center justify-center border border-white/5 w-20 sm:w-24">
            <span className="text-2xl font-body font-semibold text-accent-purple leading-none">{incomingPending.length + outgoingPending.length}</span>
            <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40 mt-1 select-none">Pending</span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Actions Sidebar (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Crystallize Connection Invite Card */}
          <div 
            ref={inviteFormRef} 
            className="liquid-glass-strong p-6 rounded-3xl border border-white/5 space-y-5 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center space-x-3 select-none">
              <div className="p-2 liquid-glass rounded-full border border-white/10 text-accent-cyan">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[11px] font-body font-semibold tracking-[0.2em] text-white uppercase leading-none">
                  Crystallize Connection
                </h4>
                <p className="text-[9px] text-white/40 font-light font-body mt-1">
                  Invite friends to start sharing spaces
                </p>
              </div>
            </div>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-body font-semibold tracking-wider text-white/40 uppercase pl-1 select-none">
                  Collaborator Email Address
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    required
                    placeholder="explorer@zero-gravity.com"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    className="w-full pl-5 pr-12 py-3.5 bg-white/[0.01] border border-white/5 rounded-full text-white placeholder-white/20 text-xs focus:outline-none focus:border-white/25 focus:bg-white/[0.02] transition-all font-body font-light tracking-wide outline-none"
                  />
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="absolute right-1.5 p-2 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white/80 hover:text-white rounded-full transition-all cursor-pointer border border-white/5"
                  >
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="flex items-center space-x-2 text-[10px] text-accent-orange font-light tracking-wide pl-2 animate-bounce">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-center space-x-2 text-[10px] text-emerald-400 font-light tracking-wide pl-2">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}
            </form>
          </div>

          {/* Connectors info tip card */}
          <div className="liquid-glass p-5 rounded-3xl border border-white/5 select-none space-y-3">
            <h5 className="text-[9px] font-body font-semibold tracking-widest text-accent-cyan uppercase">
              Relational Matrix Protocol
            </h5>
            <p className="text-[11px] text-white/50 font-light font-body leading-relaxed">
              Once an invitation is accepted, a private cryptographic Collaborative Fabric is dynamically structured. Real-time RLS subscriptions secure your synchronized memories.
            </p>
          </div>
        </div>

        {/* Right Column: Dashboards lists (Span 8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Active Collaborative Fabrics Grid */}
          <div ref={activeFoldersRef} className="space-y-4">
            <h4 className="text-[10px] font-body font-semibold tracking-[0.25em] text-white/35 uppercase select-none pl-1">
              Connected Shared Fabrics ({sharedFolders.length})
            </h4>

            {sharedFolders.length === 0 ? (
              <div className="liquid-glass p-12 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4 select-none">
                <FolderHeart className="w-8 h-8 text-white/20 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-xs text-white/50 font-medium">No Collaborative Fabrics Connected</p>
                  <p className="text-[10px] text-white/30 font-light max-w-xs leading-normal">
                    Invite a friend by typing their email on the left. The moment they accept, your synchronized space will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sharedFolders.map((folder) => {
                  const isActive = activeFolderId === folder.id;
                  
                  // Extract friend name
                  let displayName = folder.folder_name;
                  let friendEmailPrefix = '';
                  try {
                    if (folder.folder_name.startsWith('Space: ')) {
                      const usersStr = folder.folder_name.replace('Space: ', '');
                      const parts = usersStr.split(' + ');
                      
                      const friendPart = parts.find((p: string) => p !== ownEmailPart) || parts[0];
                      displayName = `Timeline with ${friendPart}`;
                      friendEmailPrefix = friendPart;
                    }
                  } catch (e) {
                    console.error('Failed to parse folder name:', e);
                  }

                  const initials = friendEmailPrefix ? friendEmailPrefix.substring(0,2).toUpperCase() : 'CO';

                  return (
                    <div
                      key={folder.id}
                      className={`group relative liquid-glass p-5 rounded-3xl border transition-all duration-500 hover:scale-[1.02] ${
                        isActive
                          ? 'border-accent-cyan/30 shadow-[0_12px_24px_-10px_rgba(0,242,254,0.15)] bg-white/[0.03]'
                          : 'border-white/5 hover:border-white/15 shadow-md bg-white/[0.01]'
                      }`}
                    >
                      {/* Active glow tag */}
                      {isActive && (
                        <div className="absolute top-4 right-4 flex items-center space-x-1 px-2.5 py-0.5 rounded-full border border-accent-cyan/20 bg-accent-cyan/5">
                          <span className="w-1 h-1 rounded-full bg-accent-cyan animate-ping" />
                          <span className="text-[7px] font-semibold uppercase tracking-widest text-accent-cyan">Active Scope</span>
                        </div>
                      )}

                      <div className="flex items-start space-x-4">
                        {/* Styled Neon Avatar Badge */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-body font-semibold text-sm transition-transform duration-500 group-hover:rotate-6 flex-shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-tr from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/30 text-accent-cyan'
                            : 'bg-white/5 border border-white/10 text-white/60 group-hover:text-white group-hover:bg-white/10 group-hover:border-white/20'
                        }`}>
                          {initials}
                        </div>

                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="space-y-1 min-w-0 pr-12">
                            <h5 className="text-xs font-semibold text-white truncate leading-tight">
                              {displayName}
                            </h5>
                            <div className="flex items-center space-x-1 text-[9px] text-white/30 font-light select-none">
                              <span className="w-1 h-1 rounded-full bg-emerald-400" />
                              <span>Real-time synchronizing</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 select-none">
                            <button
                              onClick={() => {
                                setActiveFolderId(folder.id);
                                onEnterWorkspace();
                              }}
                              className="text-[9px] font-body font-semibold tracking-widest uppercase text-accent-cyan hover:text-white transition-colors duration-300 flex items-center space-x-1 cursor-pointer bg-transparent border-none outline-none group/btn"
                            >
                              <span>Enter Workspace</span>
                              <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                            </button>
                            
                            <span className="text-[7px] font-light text-white/20">
                              {folder.created_at ? new Date(folder.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Synced Pipelines */}
          {(incomingPending.length > 0 || outgoingPending.length > 0) && (
            <div ref={pendingRequestsRef} className="space-y-4">
              <h4 className="text-[10px] font-body font-semibold tracking-[0.25em] text-white/35 uppercase select-none pl-1">
                Pending Synced Pipelines ({incomingPending.length + outgoingPending.length})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Incoming Requests */}
                {incomingPending.map((req) => {
                  const requesterEmail = resolvedEmails[req.user_id] || 'Resolving entity...';
                  const initials = getInitials(requesterEmail);
                  
                  return (
                    <div 
                      key={req.id} 
                      className="liquid-glass-strong p-4 rounded-3xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4 transition-all duration-300 hover:border-white/10"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple font-body font-semibold text-xs flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 space-y-0.5 select-none">
                          <p className="text-[9px] font-semibold text-accent-purple uppercase tracking-widest leading-none">Incoming Synced Portal</p>
                          <p className="text-xs text-white/70 font-light truncate" title={requesterEmail}>
                            {requesterEmail}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1.5 flex-shrink-0 select-none">
                        {actionLoadingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
                        ) : (
                          <>
                            <button
                              onClick={() => handleAction(req.id, true)}
                              title="Connect Portal"
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-full transition-all cursor-pointer border border-emerald-500/10 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleAction(req.id, false)}
                              title="Reject Portal"
                              className="p-2 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange hover:text-accent-orange/80 rounded-full transition-all cursor-pointer border border-accent-orange/10 shadow-sm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Outgoing Requests */}
                {outgoingPending.map((req) => {
                  const recipientEmail = resolvedEmails[req.friend_id] || 'Resolving entity...';
                  const initials = getInitials(recipientEmail);
                  
                  return (
                    <div 
                      key={req.id} 
                      className="liquid-glass-strong p-4 rounded-3xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4 transition-all duration-300 hover:border-white/10"
                    >
                      <div className="flex items-center space-x-3 min-w-0 opacity-60">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/40 font-body font-semibold text-xs flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 space-y-0.5 select-none">
                          <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest leading-none">Awaiting Handshake</p>
                          <p className="text-xs text-white/70 font-light truncate" title={recipientEmail}>
                            {recipientEmail}
                          </p>
                        </div>
                      </div>
                      
                      {actionLoadingId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/40 flex-shrink-0" />
                      ) : (
                        <button
                          onClick={() => handleAction(req.id, false)}
                          title="Cancel Invitation"
                          className="p-2 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 rounded-full transition-all cursor-pointer border border-white/5 flex-shrink-0 select-none"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>
          )}

          {/* Connected Dreamers (Accepted friends list) */}
          <div ref={activeFriendsRef} className="space-y-4">
            <h4 className="text-[10px] font-body font-semibold tracking-[0.25em] text-white/35 uppercase select-none pl-1">
              Connected Dreamers ({acceptedConnections.length})
            </h4>

            {acceptedConnections.length === 0 ? (
              <p className="text-xs text-white/30 font-light italic pl-1">
                No connected dreamers yet. Establish a synergy node on the left.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {acceptedConnections.map((friendship) => {
                  const targetUid = friendship.user_id === currentUserId ? friendship.friend_id : friendship.user_id;
                  const friendEmail = resolvedEmails[targetUid] || 'Syncing connection...';
                  const initials = getInitials(friendEmail);

                  return (
                    <div 
                      key={friendship.id}
                      className="group liquid-glass p-4 rounded-3xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4 transition-all duration-300 hover:border-white/10"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-cyan/10 to-accent-purple/10 border border-white/10 group-hover:border-accent-cyan/20 text-white/70 group-hover:text-white font-body font-semibold text-xs flex items-center justify-center flex-shrink-0 transition-all duration-300">
                          {initials}
                        </div>
                        
                        <div className="min-w-0 space-y-0.5 select-none">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] font-semibold text-white/60 group-hover:text-accent-cyan uppercase tracking-widest leading-none transition-colors duration-300">Synchronized</p>
                          </div>
                          <p className="text-xs text-white/80 font-light truncate" title={friendEmail}>
                            {friendEmail}
                          </p>
                        </div>
                      </div>

                      {/* Disconnect Action */}
                      {actionLoadingId === friendship.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-accent-orange flex-shrink-0" />
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Disconnect collaboration fabric with ${friendEmail}? This will also delete any synced shared timeline workspace.`)) {
                              handleAction(friendship.id, false);
                            }
                          }}
                          title="Disconnect Synergy Node"
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-accent-orange/10 text-white/30 hover:text-accent-orange rounded-full transition-all duration-300 cursor-pointer border border-transparent hover:border-accent-orange/10 flex-shrink-0 select-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 3. Footer branding */}
      <div className="border-t border-white/5 pt-6 text-center mt-12 select-none">
        <p className="text-[9px] font-body tracking-[0.25em] text-white/15 uppercase font-semibold">
          Collaborative Quantum Matrix Gateway
        </p>
      </div>
    </div>
  );
}
