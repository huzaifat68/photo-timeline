import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  Lock, 
  Plus, 
  Search, 
  Cpu, 
  Layers, 
  Flame, 
  Loader2, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  User,
  HeartHandshake,
  LogOut,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';

// Backend & Workspace components
import { supabase } from './lib/supabaseClient';
import { useMemories } from './hooks/useMemories';
import { PhysicsSandbox } from './components/PhysicsSandbox';
import { MemoryTimeline } from './components/MemoryTimeline';
import { AddMemoryModal } from './components/AddMemoryModal';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { CollaborationsPage } from './components/CollaborationsPage';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import type { Memory } from './hooks/useMemories';
const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4';

function LogoMark({ onClick }: { onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center gap-2 select-none group cursor-pointer">
      <svg 
        width="28" 
        height="28" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="transition-transform duration-500 group-hover:rotate-180 text-white"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
        <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="opacity-30" />
        {/* Glowing crystal core representing memory storage */}
        <path d="M12 7l4 5-4 5-4-5 4-5z" fill="white" className="shadow-sm animate-pulse" />
      </svg>
      <span className="font-heading italic text-base tracking-tight text-white font-medium">PhotoTimeline</span>
    </div>
  );
}

export default function App() {
  // --- Supabase Real-Time Backend Hook ---
  const { 
    memories, 
    loading, 
    error, 
    addMemory, 
    deleteMemory,
    friendships,
    sharedFolders,
    activeFolderId,
    setActiveFolderId,
    sendFriendRequest,
    respondToFriendRequest,
    user
  } = useMemories();

  // --- Mobile Screen & Capabilities Detection ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const mobileQuery = window.innerWidth < 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      setIsMobile(mobileQuery);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Auth Screen States ---
  const [accessGranted, setAccessGranted] = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);
  const isRecoveryInit = window.location.hash.includes('type=recovery') || 
                         window.location.search.includes('type=recovery') ||
                         window.location.hash.includes('error_code=') ||
                         window.location.search.includes('error_code=');
  const isResetFlowRef = useRef(isRecoveryInit);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(() => {
    return isRecoveryInit ? 'reset' : 'signin';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('photo_timeline_remember_me') !== 'false';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Boomerang Engine Configuration States ---
  const [boomerangSpeed, setBoomerangSpeed] = useState<'slow' | 'standard' | 'fast' | 'dynamic'>('dynamic');
  const [activeFPS, setActiveFPS] = useState(0);
  const [hudVisible, setHudVisible] = useState(true);
  const [corsBlocked, setCorsBlocked] = useState(false);

  // Real-time password strength metrics
  const isPassLengthValid = password.length >= 6;
  const isPassNumValid = /\d/.test(password);
  const isPassSpecialValid = /[^A-Za-z0-9]/.test(password);
  const isPassStrong = isPassLengthValid && isPassNumValid && isPassSpecialValid;


  // --- UI Layout & Feed State ---
  const [activeView, setActiveView] = useState<'sandbox' | 'timeline' | 'collaborations'>('sandbox');
  // isWorkspaceFocused removed — hero always visible, scroll-based navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Scopes temporary Event/Group rooms via URL parameter
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // --- Modals State ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [username, setUsername] = useState('');

  // --- Hero & Player States ---
  const [mounted, setMounted] = useState(false);
  const [framesReady, setFramesReady] = useState(false);

  // --- Element Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBgRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Parse room query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setActiveRoomId(room);
    }
  }, []);

  // Filter memories list based on user search, categories, and temporary rooms
  const filteredMemories = memories.filter((memory) => {
    const matchesSearch = 
      searchQuery.trim() === '' || 
      memory.parsed.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      memory.parsed.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memory.parsed.tags && memory.parsed.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = 
      selectedCategory === 'All' || 
      memory.parsed.category === selectedCategory;

    // Filter by temporary room if in personal mode and room parameter exists
    const matchesRoom = activeFolderId 
      ? true // Folders bypass room parameters (stored securely via folder_id relational key)
      : activeRoomId
        ? memory.parsed.room === activeRoomId
        : !memory.parsed.room; // Hide room memories in personal timeline

    return matchesSearch && matchesCategory && matchesRoom;
  });

  // --- Effect: Listen to Auth sessions ---
  useEffect(() => {
    let active = true;

    // Check URL parameters first before Supabase consumes them
    const isRecovery = window.location.hash.includes('type=recovery') || 
                       window.location.search.includes('type=recovery') ||
                       window.location.hash.includes('error_code=') ||
                       window.location.search.includes('error_code=');

    if (isRecovery) {
      isResetFlowRef.current = true;
      setAuthMode('reset');
      setAccessGranted(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        if (isResetFlowRef.current) {
          setAuthMode('reset');
          setAccessGranted(false);
        } else if (session && session.user) {
          setAccessGranted(true);
        }
        setAuthInitializing(false);
      }
    }).catch((err) => {
      console.error('Session get failed:', err);
      if (active) {
        setAuthInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) {
        if (event === 'PASSWORD_RECOVERY') {
          isResetFlowRef.current = true;
          setAuthMode('reset');
          setAccessGranted(false);
        } else if (session && session.user) {
          // If we are in the reset flow, keep accessGranted false to display the reset form
          if (isResetFlowRef.current || authMode === 'reset') {
            setAccessGranted(false);
            setAuthMode('reset');
          } else {
            setAccessGranted(true);
          }
        } else if (event === 'SIGNED_OUT') {
          isResetFlowRef.current = false;
          setAccessGranted(false);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authMode]);

  // --- Effect: Entrance Animations ---
  useEffect(() => {
    if (accessGranted) {
      setMounted(true);
    } else {
      setMounted(false);
    }
  }, [accessGranted]);

  useEffect(() => {
    if (mounted && navRef.current) {
      // Animate navbar sliding down elegantly from top
      gsap.fromTo(navRef.current, 
        { y: -70, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out', delay: 0.1 }
      );
    }
  }, [mounted]);

  // --- True Boomerang Engine: Seek-Throttled with Canvas Rendering & Native Fallback ---
  // We control video.currentTime and WAIT for the 'seeked' event before advancing.
  // If CORS blocks canvas drawImage, we immediately fall back to playing the video natively
  // with native looping. This guarantees a beautiful looping animation that never freezes!
  useEffect(() => {
    const video = videoRef.current;
    const canvas = displayCanvasRef.current;
    if (!video) return;

    let active = true;
    let direction = 1; // 1 = forward, -1 = backward
    let currentPosition = 0;
    let isSeeking = false;
    let ctx: CanvasRenderingContext2D | null = null;
    let frameCount = 0;
    let lastFPSUpdate = performance.now();

    console.log('[Boomerang] Re-initializing loop engine. Fallback native mode:', corsBlocked || isMobile);

    const startEngine = () => {
      if (!active) return;

      const duration = video.duration;
      if (!duration || isNaN(duration) || duration <= 0) {
        console.warn('[Boomerang] Invalid video duration, waiting for metadata...');
        return;
      }

      // If already CORS blocked or on mobile, configure native hardware-accelerated video fallback loop
      if (corsBlocked || isMobile) {
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        
        let playbackRate = 1.0;
        if (boomerangSpeed === 'slow') playbackRate = 0.55;
        else if (boomerangSpeed === 'fast') playbackRate = 1.6;
        
        video.playbackRate = playbackRate;
        video.play().catch((err) => {
          console.warn('[Boomerang] Native play failed:', err);
        });
        
        setFramesReady(true);
        return;
      }

      // Initialize canvas drawing if CORS is allowed
      if (canvas) {
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
        ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
      }

      // Pause native playback — manual seek controls manual frames
      video.pause();
      video.loop = false;
      currentPosition = 0;
      video.currentTime = 0;

      const getStepSize = () => {
        const baseStep = 1 / 30; // 30 FPS target
        let speedMultiplier = 1.0;
        if (boomerangSpeed === 'slow') {
          speedMultiplier = 0.55;
        } else if (boomerangSpeed === 'fast') {
          speedMultiplier = 1.6;
        } else if (boomerangSpeed === 'dynamic') {
          // Dynamic acceleration curve
          const progress = duration > 0 ? Math.max(0, Math.min(1, currentPosition / duration)) : 0;
          speedMultiplier = Math.sin(progress * Math.PI) * 1.4 + 0.3;
        }
        return baseStep * speedMultiplier;
      };

      const drawFrame = () => {
        if (!ctx || !canvas) return;
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (err: any) {
          if (err.name === 'SecurityError') {
            console.warn('[Boomerang] CORS blocked canvas drawImage. Falling back to native video element.');
            setCorsBlocked(true);
            
            // Re-configure video to play natively instantly
            video.loop = true;
            let playbackRate = 1.0;
            if (boomerangSpeed === 'slow') playbackRate = 0.55;
            else if (boomerangSpeed === 'fast') playbackRate = 1.6;
            
            video.playbackRate = playbackRate;
            video.play().catch(() => {});
            active = false; // Disable manual seek loop
          }
        }
      };

      const seekToNext = () => {
        if (!active || isSeeking || corsBlocked || isMobile) return;

        const step = getStepSize();
        currentPosition += direction * step;

        // --- TRUE BOOMERANG BOUNCE (REVERSAL) ---
        if (currentPosition >= duration) {
          currentPosition = duration - 0.02; // back off slightly from end boundary
          direction = -1; // REVERSE direction to play BACKWARD!
        }
        if (currentPosition <= 0) {
          currentPosition = 0;
          direction = 1; // REVERSE direction to play FORWARD!
        }

        isSeeking = true;
        video.currentTime = currentPosition;
      };

      const onSeeked = () => {
        if (!active || corsBlocked || isMobile) return;
        isSeeking = false;

        drawFrame();

        // FPS Diagnoser
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastFPSUpdate;
        if (elapsed >= 500) {
          const fps = Math.round((frameCount * 1000) / elapsed);
          setActiveFPS(fps);
          frameCount = 0;
          lastFPSUpdate = now;
        }

        // Request next frame seek step
        requestAnimationFrame(() => {
          if (active && !corsBlocked && !isMobile) seekToNext();
        });
      };

      video.addEventListener('seeked', onSeeked);
      setFramesReady(true);

      // Kick off the manual seeking loop
      seekToNext();

      return () => {
        video.removeEventListener('seeked', onSeeked);
      };
    };

    let cleanupEngine: (() => void) | undefined;

    // Start immediately if video metadata is ready, otherwise wait for loadedmetadata event
    if (video.readyState >= 1 && video.duration > 0 && !isNaN(video.duration)) {
      cleanupEngine = startEngine();
    } else {
      const handleReady = () => {
        video.removeEventListener('loadedmetadata', handleReady);
        if (active) cleanupEngine = startEngine();
      };
      video.addEventListener('loadedmetadata', handleReady);
    }

    return () => {
      active = false;
      cleanupEngine?.();
      console.log('[Boomerang] Background loop cleaned up.');
    };
  }, [boomerangSpeed, corsBlocked, isMobile]);

  // --- Effect 3: High-Performance GPU Parallax Tracking ---
  useEffect(() => {
    // Disable high-frequency mousemove parallax listeners on mobile or touch-capable screens
    const isTouchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || isMobile;
    if (isTouchCapable) {
      if (videoBgRef.current) {
        // Direct premium hardware accelerated centered transform
        videoBgRef.current.style.transform = 'translate3d(0px, 0px, 0px) scale(1.08)';
      }
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const strength = 18; // Premium, fixed parallax magnitude bounds

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = cx ? ((e.clientX - cx) / cx) * strength : 0;
      targetY = cy ? ((e.clientY - cy) / cy) * strength : 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let animFrameId: number;
    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.08; // Buttery-smooth interpolation
      currentY += (targetY - currentY) * 0.08;

      if (videoBgRef.current) {
        // Direct transform update using hardware-accelerated 3D transforms & static premium scale
        videoBgRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0px) scale(1.08)`;
      }

      animFrameId = requestAnimationFrame(updateParallax);
    };

    animFrameId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrameId);
    };
  }, [isMobile]);

  // --- Helper: Smooth Scroll to workspace ---
  const handleScrollToWorkspace = () => {
    // Wrap in a tiny timeout to ensure React DOM updates are fully painted
    setTimeout(() => {
      const workspace = document.getElementById('workspace');
      if (workspace) {
        workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Fallback for browsers with aborted/laggy smooth scrolling:
        // If scroll position hasn't changed after 150ms, force instant snap
        const initialY = window.scrollY;
        setTimeout(() => {
          if (window.scrollY === initialY && initialY === 0) {
            const rect = workspace.getBoundingClientRect();
            const targetY = rect.top + window.scrollY;
            window.scrollTo({ top: targetY, behavior: 'auto' });
          }
        }, 150);
      }
    }, 50);
  };

  // --- Auth Handlers ---

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setSuccessMessage(null);

    // Save rememberMe preference so customStorage reads it during session operations
    localStorage.setItem('photo_timeline_remember_me', rememberMe ? 'true' : 'false');

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAccessGranted(true);
      } else {
        // Front-end Validation for Sign Up
        if (!username.trim()) {
          throw new Error('Please enter a display name.');
        }
        if (!isPassStrong) {
          throw new Error('Please ensure your password meets all strength requirements.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter.');
        }

        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              display_name: username.trim()
            }
          }
        });
        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
          setSuccessMessage('Registration successful! Please check your email to verify your account.');
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          setAccessGranted(true);
        }
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      setAuthError(err.message || 'Authentication credentials rejected.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setSuccessMessage(null);
    try {
      if (!email.trim()) {
        throw new Error('Please enter your email address.');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setSuccessMessage('A password recovery link has been sent to your email address.');
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setAuthError(err.message || 'Failed to send recovery email.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setSuccessMessage(null);
    try {
      if (!isPassStrong) {
        throw new Error('Please ensure your password meets all strength requirements.');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match. Please re-enter.');
      }

      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;

      setSuccessMessage('Password updated successfully! You can now sign in with your new password.');
      isResetFlowRef.current = false;
      setAuthMode('signin');
      setPassword('');
      setConfirmPassword('');

      // Clean up URL query and hash parameters to remove recovery tokens
      if (window.history.pushState) {
        window.history.pushState('', document.title, window.location.pathname);
      } else {
        window.location.hash = '';
      }
    } catch (err: any) {
      console.error('Password update failed:', err);
      setAuthError(err.message || 'Failed to update password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Demo Login disabled per request



  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setAccessGranted(false);
      setMounted(false);
      setFramesReady(false); // Reset boomerang engine state on sign-out
    } else {
      console.error('Sign out failed:', error);
    }
  };

  const handleEnrichedAddMemory = async (metadata: any, imageUrl: string | null, dateStr: string) => {
    // Enrich with temporary room parameter if not in permanent folder mode
    const enrichedMetadata = {
      ...metadata,
      room: activeFolderId ? undefined : (activeRoomId || undefined)
    };
    return await addMemory(enrichedMetadata, imageUrl, dateStr);
  };

  // --- Parse Workspace Header title dynamically ---
  let workspaceTitle = 'Memories Matrix';
  let workspaceSubtitle = 'The real-time shared fabric of floating memories';
  
  if (activeFolderId) {
    const folder = sharedFolders.find(f => f.id === activeFolderId);
    if (folder) {
      try {
        if (folder.folder_name.startsWith('Space: ')) {
          const usersStr = folder.folder_name.replace('Space: ', '');
          const parts = usersStr.split(' + ');
          const ownEmailPart = user?.email?.split('@')[0] || '';
          const friendPart = parts.find((p: string) => p !== ownEmailPart) || parts[0];
          workspaceTitle = `Timeline with ${friendPart}`;
          workspaceSubtitle = 'A permanent, collaborative shared gallery';
        } else {
          workspaceTitle = folder.folder_name;
        }
      } catch (e) {
        workspaceTitle = folder.folder_name;
      }
    }
  } else if (activeRoomId) {
    workspaceTitle = `Room: ${activeRoomId}`;
    workspaceSubtitle = 'A temporary visual timeline event sandbox';
  }

  // --- ZERO STAGE: LOADING SPLASH DURING SESSION RESUME ---
  if (authInitializing) {
    return (
      <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black">
        <div className="absolute inset-0 bg-radial-gradient from-accent-purple/10 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center space-y-4 select-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-white/40 animate-spin" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-semibold font-body">Crystallizing Timeline...</span>
        </div>
      </div>
    );
  }

  // --- DUAL-STAGE VISUAL VIEWPORT WRAPPER (Persistent Background) ---
  return (
    <div className="min-h-screen bg-black text-white font-body selection:bg-white/20 relative overflow-x-hidden">
      
      {/* 1. Immersive Persistent Background Layer (Fixed backdrop never unmounts) */}
      <div 
        ref={videoBgRef} 
        className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none scale-[1.08] origin-center"
      >
        {/* Fallback Video: plays natively if CORS blocks canvas draw, or until canvas is initialized */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          autoPlay
          loop
          preload="auto"
          crossOrigin="anonymous"
          className={`w-full h-full object-cover transition-all duration-[1200ms] ease-in-out ${
            !accessGranted ? 'filter blur-[16px] opacity-60 scale-[1.05]' : 'opacity-100 scale-100'
          }`}
          style={{ display: (corsBlocked || isMobile || !framesReady) ? 'block' : 'none' }}
        />
        {/* Canvas: renders boomerang frames if CORS is allowed */}
        <canvas
          ref={displayCanvasRef}
          className={`w-full h-full object-cover transition-all duration-[1200ms] ease-in-out ${
            !accessGranted ? 'filter blur-[16px] opacity-60 scale-[1.05]' : 'opacity-100 scale-100'
          }`}
          style={{ display: (corsBlocked || isMobile || !framesReady) ? 'none' : 'block' }}
        />
      </div>

      {/* Multi-layered Premium Background Enhancement (Always active, hardware optimized) */}
      {/* Layer 1: Primary gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/30 to-black/10 z-[1] pointer-events-none" />
      {/* Layer 2: Subtle radial vignette */}
      <div className="fixed inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
      {/* Layer 3: Bottom-heavy darkening for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-black/85 z-[3] pointer-events-none" />
      {/* Layer 4: Animated ambient orbs (100% GPU-native radial gradients, no recalculation lag!) */}
      <div className="fixed top-[15%] left-[20%] w-[600px] h-[600px] bg-radial-glow-purple rounded-full z-[4] pointer-events-none animate-float-slow" />
      <div className="fixed top-[45%] right-[15%] w-[500px] h-[500px] bg-radial-glow-cyan rounded-full z-[4] pointer-events-none animate-float-slow" style={{ animationDelay: '-3s' }} />
      <div className="fixed bottom-[15%] left-[35%] w-[700px] h-[700px] bg-radial-glow-pink rounded-full z-[4] pointer-events-none animate-float-slow" style={{ animationDelay: '-6s' }} />
      {/* Layer 5: Film grain noise texture */}
      <div className="fixed inset-0 z-[5] pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

      {/* Render Authentication Gateway or Workspace View */}
      {/* Render Authentication Gateway or Workspace View */}
      {!accessGranted ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden h-screen w-screen bg-black/65 backdrop-blur-[4px] selection:bg-white/20">
          
          {/* Overlay Shade */}
          <div className="absolute inset-0 bg-black/55 z-10 pointer-events-none" />

          {/* Floating background lights - Optimized Radial Glows */}
          <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-radial-glow-purple-auth rounded-full pointer-events-none animate-pulse z-10" />
          <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] bg-radial-glow-cyan-auth rounded-full pointer-events-none animate-pulse z-10" style={{ animationDelay: '-2s' }} />

          {/* Premium Glass Auth Card */}
          <div className="relative z-20 w-full max-w-[420px] mx-4 p-8 sm:p-9 liquid-glass-strong rounded-3xl border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col items-center space-y-7 text-center bg-white/[0.01]">
            
            {/* Card Header Branding */}
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 liquid-glass rounded-full border border-white/10 bg-white/[0.02] shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white animate-spin" style={{ animationDuration: '28s' }}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                  <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="opacity-30" />
                  <path d="M12 7l4 5-4 5-4-5 4-5z" fill="white" />
                </svg>
              </div>
              <h2 className="text-3.5xl font-heading italic text-white tracking-tight select-none leading-none">Photo Timeline</h2>
              <p className="text-[9px] font-body tracking-[0.22em] uppercase text-white/40 select-none">
                Crystallize your moments in zero gravity
              </p>
            </div>

            {/* Panel Selector or Escape Back Option */}
            {authMode === 'forgot' || authMode === 'reset' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                  setSuccessMessage(null);
                  setPassword('');
                  setConfirmPassword('');
                  if (window.history.pushState) {
                    window.history.pushState('', document.title, window.location.pathname);
                  } else {
                    window.location.hash = '';
                  }
                }}
                className="self-start flex items-center space-x-2 py-1.5 px-4 rounded-full border border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/5 text-[9px] font-semibold uppercase tracking-widest text-white/50 hover:text-white cursor-pointer transition-all duration-300 select-none animate-fade-in"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            ) : (
              /* Toggle Switcher (Sign In vs Sign Up) with sliding glass animation */
              <div className="relative p-0.5 liquid-glass flex w-full rounded-full bg-white/[0.01] border border-white/5 select-none">
                {/* Sliding highlight pill */}
                <div 
                  className="absolute top-0.5 bottom-0.5 bg-white/10 rounded-full transition-all duration-350 ease-out border border-white/10 shadow-md"
                  style={{
                    left: authMode === 'signin' ? '2px' : 'calc(50% + 1px)',
                    width: 'calc(50% - 3px)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError(null);
                    setSuccessMessage(null);
                  }}
                  className={`w-1/2 relative z-10 py-2.5 text-[10px] uppercase tracking-[0.15em] transition-colors duration-300 cursor-pointer font-body ${
                    authMode === 'signin' ? 'text-white font-semibold' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                    setSuccessMessage(null);
                  }}
                  className={`w-1/2 relative z-10 py-2.5 text-[10px] uppercase tracking-[0.15em] transition-colors duration-300 cursor-pointer font-body ${
                    authMode === 'signup' ? 'text-white font-semibold' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}
            <form 
              onSubmit={
                authMode === 'forgot' 
                  ? handlePasswordReset 
                  : authMode === 'reset' 
                    ? handlePasswordUpdate 
                    : handleAuthSubmit
              } 
              className="w-full flex flex-col space-y-4"
            >
              {/* Form Input fields depending on mode */}
              {authMode === 'signup' && (
                <div className="relative w-full flex items-center group/input animate-fade-in">
                  <User className="absolute left-4 w-4 h-4 text-white/30 group-focus-within/input:text-accent-cyan transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Display Name / Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={authLoading}
                    className="w-full pl-12 pr-5 py-3.5 liquid-glass rounded-full border border-white/5 focus:border-accent-cyan/35 focus:bg-white/[0.02] outline-none text-white text-xs font-body font-light tracking-wide bg-white/[0.01] transition-all duration-300"
                  />
                </div>
              )}

              {authMode !== 'reset' && (
                <div className="relative w-full flex items-center group/input animate-fade-in">
                  <Mail className="absolute left-4 w-4 h-4 text-white/30 group-focus-within/input:text-white/60 transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={authLoading}
                    className="w-full pl-12 pr-5 py-3.5 liquid-glass rounded-full border border-white/5 focus:border-white/25 focus:bg-white/[0.02] outline-none text-white text-xs font-body font-light tracking-wide bg-white/[0.01] transition-all duration-300"
                  />
                </div>
              )}
              
              {authMode !== 'forgot' && (
                <div className="relative w-full flex items-center group/input animate-fade-in">
                  <Lock className="absolute left-4 w-4 h-4 text-white/30 group-focus-within/input:text-white/60 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={authMode === 'reset' ? 'New Password' : 'Password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={authLoading}
                    className="w-full pl-12 pr-12 py-3.5 liquid-glass rounded-full border border-white/5 focus:border-white/25 focus:bg-white/[0.02] outline-none text-white text-xs font-body font-light tracking-wide bg-white/[0.01] transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-white/30 hover:text-white/60 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {(authMode === 'signup' || authMode === 'reset') && (
                <>
                  <div className="relative w-full flex items-center group/input animate-fade-in">
                    <Lock className="absolute left-4 w-4 h-4 text-white/30 group-focus-within/input:text-white/60 transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder={authMode === 'reset' ? 'Confirm New Password' : 'Confirm Password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={authLoading}
                      className="w-full pl-12 pr-12 py-3.5 liquid-glass rounded-full border border-white/5 focus:border-white/25 focus:bg-white/[0.02] outline-none text-white text-xs font-body font-light tracking-wide bg-white/[0.01] transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 text-white/30 hover:text-white/60 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Guidelines */}
                  <div className="w-full text-left pl-3 space-y-1.5 animate-fade-in bg-white/[0.01] p-3.5 rounded-2xl border border-white/5">
                    <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/30">Password Requirements:</span>
                    <div className="space-y-1 text-[9px] font-light font-body tracking-wider text-white/55">
                      <div className="flex items-center space-x-1.5">
                        {isPassLengthValid ? (
                          <Check className="w-3.5 h-3.5 text-accent-cyan" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-white/20" />
                        )}
                        <span className={isPassLengthValid ? 'text-white/80' : 'text-white/40'}>At least 6 characters</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isPassNumValid ? (
                          <Check className="w-3.5 h-3.5 text-accent-cyan" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-white/20" />
                        )}
                        <span className={isPassNumValid ? 'text-white/80' : 'text-white/40'}>Includes a number (0-9)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isPassSpecialValid ? (
                          <Check className="w-3.5 h-3.5 text-accent-cyan" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-white/20" />
                        )}
                        <span className={isPassSpecialValid ? 'text-white/80' : 'text-white/40'}>Includes a symbol (!@#$ etc.)</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Remember Me checkbox & Forgot password trigger in Sign In */}
              {authMode === 'signin' && (
                <div className="flex justify-between items-center w-full px-2 mt-1 select-none">
                  {/* Glass Checkbox Wrapper */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={authLoading}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        rememberMe 
                          ? 'bg-white border-white' 
                          : 'border-white/20 group-hover:border-white/40 bg-white/[0.02]'
                      }`}>
                        {rememberMe && <Check className="w-3 h-3 text-black stroke-[3px]" />}
                      </div>
                    </div>
                    <span className="text-[10px] font-body font-light tracking-wide text-white/50 group-hover:text-white/80 transition-colors">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setAuthError(null);
                      setSuccessMessage(null);
                    }}
                    disabled={authLoading}
                    className="text-[10px] font-body font-light tracking-wide text-white/40 hover:text-white/80 transition-colors cursor-pointer bg-transparent border-none outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Status Alert Panels (Error / Success Messages) */}
              {authError && (
                <div className="w-full flex items-start gap-2.5 p-3.5 liquid-glass rounded-2xl border border-accent-orange/20 bg-accent-orange/[0.02] shadow-[0_4px_12px_rgba(255,88,88,0.05)] text-left animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-accent-orange mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] font-light tracking-wide text-accent-orange/95 leading-relaxed font-body">
                    {authError}
                  </span>
                </div>
              )}

              {successMessage && (
                <div className="w-full flex items-start gap-2.5 p-3.5 liquid-glass rounded-2xl border border-accent-cyan/20 bg-accent-cyan/[0.02] shadow-[0_4px_12px_rgba(0,242,254,0.05)] text-left animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-accent-cyan mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] font-light tracking-wide text-accent-cyan/95 leading-relaxed font-body">
                    {successMessage}
                  </span>
                </div>
              )}

              {/* Premium Interactive Action Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-full cursor-pointer flex items-center justify-center space-x-2 shadow-[0_4px_20px_rgba(255,255,255,0.15)] border-none"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <span>
                    {authMode === 'signin' 
                      ? 'Sign In' 
                      : authMode === 'signup' 
                        ? 'Create Account' 
                        : authMode === 'forgot'
                          ? 'Send Reset Link'
                          : 'Update Password'
                    }
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
      <nav 
        ref={navRef}
        className="fixed top-0 left-0 w-full z-50 pointer-events-none"
        style={{ opacity: mounted ? 1 : 0 }}
      >
        {/* DESKTOP HEADER NAVIGATION: Visible on md screens and up */}
        <div 
          className="hidden md:flex absolute top-0 left-0 right-0 w-full h-16 items-center justify-between px-8 bg-black/45 border-b border-white/[0.06] backdrop-blur-xl pointer-events-auto shadow-md"
          style={
            (activeFolderId || activeRoomId)
              ? { boxShadow: '0 4px 30px rgba(0, 242, 254, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05)' }
              : undefined
          }
        >
          {/* Left Section: Logo & Escape Trigger */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <LogoMark />
            
            {/* Dynamic back-to-personal-space escape button */}
            {(activeFolderId || activeRoomId) && (
              <button
                onClick={() => {
                  setActiveFolderId(null);
                  setActiveRoomId(null);
                  if (window.location.search) {
                    window.history.pushState({}, '', window.location.pathname);
                  }
                }}
                className="flex items-center space-x-1.5 py-1 px-3 rounded-full border border-accent-cyan/20 bg-accent-cyan/10 hover:bg-accent-cyan/25 text-[8px] font-semibold uppercase tracking-widest text-accent-cyan hover:text-white cursor-pointer transition-all duration-300 shadow-[0_0_15px_rgba(0,242,254,0.05)] hover:scale-105 active:scale-95 animate-fade-in flex-shrink-0"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>My Space</span>
              </button>
            )}
          </div>

          {/* Center Section: View selectors */}
          <div className="flex items-center gap-6">
            {/* Sliding Glass View Selector Switcher */}
            <div className="relative flex items-center bg-white/5 rounded-full p-0.5 border border-white/5 select-none w-[270px] flex-shrink-0">
              {/* Sliding highlight */}
              <div 
                className="absolute top-0.5 bottom-0.5 bg-white/10 rounded-full transition-all duration-300 ease-out"
                style={{
                  left: activeView === 'sandbox' 
                    ? '2px' 
                    : activeView === 'timeline' 
                      ? 'calc(33.33% + 1px)' 
                      : 'calc(66.66% + 1px)',
                  width: 'calc(33.33% - 3px)',
                }}
              />
              <button 
                onClick={() => {
                  setActiveView('sandbox');
                  handleScrollToWorkspace();
                }}
                className={`w-1/3 relative z-10 py-1.5 text-[9px] font-body font-light tracking-[0.2em] uppercase transition-colors duration-200 cursor-pointer text-center ${
                  activeView === 'sandbox' ? 'text-white font-medium' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Gallery
              </button>
              <button 
                onClick={() => {
                  setActiveView('timeline');
                  handleScrollToWorkspace();
                }}
                className={`w-1/3 relative z-10 py-1.5 text-[9px] font-body font-light tracking-[0.2em] uppercase transition-colors duration-200 cursor-pointer text-center ${
                  activeView === 'timeline' ? 'text-white font-medium' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Timeline
              </button>
              <button 
                onClick={() => {
                  setActiveView('collaborations');
                  handleScrollToWorkspace();
                }}
                className={`w-1/3 relative z-10 py-1.5 text-[9px] font-body font-light tracking-[0.2em] uppercase transition-colors duration-200 cursor-pointer text-center ${
                  activeView === 'collaborations' ? 'text-white font-medium' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Collabs
              </button>
            </div>
          </div>

          {/* Right Section: Profile Settings & Authentication Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Premium user account badge */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 rounded-full select-none cursor-pointer transition-all duration-300 group/profile"
            >
              <User className="w-3 h-3 text-white/50 group-hover/profile:text-accent-cyan transition-colors" />
              <span className="font-body text-[9px] font-light tracking-wider text-white/70 group-hover/profile:text-white transition-colors">
                {user?.user_metadata?.display_name || (user?.email ? user.email.split('@')[0] : 'Guest Account')}
              </span>
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
            </button>

            <div className="w-px h-3 bg-white/15" />

            <button 
              onClick={handleSignOut}
              className="font-body text-[9px] font-light tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors duration-200 cursor-pointer bg-transparent border-none outline-none"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* MOBILE TOP NAVIGATION BAR: Visible only on small viewports */}
        <div className="flex md:hidden absolute top-3 left-3 right-3 justify-between items-center px-4 py-2.5 pointer-events-auto liquid-glass rounded-full border border-white/5 shadow-lg bg-black/60 backdrop-blur-md">
          <LogoMark />
          <div className="flex items-center gap-2">
            {/* Mobile dynamic back to personal space escape button */}
            {(activeFolderId || activeRoomId) && (
              <button
                onClick={() => {
                  setActiveFolderId(null);
                  setActiveRoomId(null);
                  if (window.location.search) {
                    window.history.pushState({}, '', window.location.pathname);
                  }
                }}
                className="flex items-center justify-center p-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/10 text-accent-cyan active:scale-95 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Settings button */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all active:scale-95 text-white/70"
            >
              <User className="w-3.5 h-3.5" />
            </button>
            {/* Sign out button */}
            <button 
              onClick={handleSignOut}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all active:scale-95 text-white/40 hover:text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MOBILE FLOATING BOTTOM BAR NAVIGATION: Visible only on small viewports */}
        <div className="flex md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[88%] max-w-[340px] pointer-events-auto justify-around items-center px-2 py-2 liquid-glass-strong rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.6)] border border-white/10 bg-black/85 backdrop-blur-lg select-none pb-safe z-50">
          {/* Mobile Gallery (Sandbox) */}
          <button
            onClick={() => {
              setActiveView('sandbox');
              handleScrollToWorkspace();
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-300 ${
              activeView === 'sandbox'
                ? 'text-accent-cyan scale-105 font-medium'
                : 'text-white/40'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="text-[7px] font-semibold uppercase tracking-widest mt-1 font-body">Gallery</span>
          </button>

          {/* Mobile Timeline */}
          <button
            onClick={() => {
              setActiveView('timeline');
              handleScrollToWorkspace();
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-300 ${
              activeView === 'timeline'
                ? 'text-accent-purple scale-105 font-medium'
                : 'text-white/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[7px] font-semibold uppercase tracking-widest mt-1 font-body">Timeline</span>
          </button>

          {/* Mobile Collaborations */}
          <button
            onClick={() => {
              setActiveView('collaborations');
              handleScrollToWorkspace();
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-300 relative ${
              activeView === 'collaborations'
                ? 'text-accent-pink scale-105 font-medium'
                : 'text-white/40'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span className="text-[7px] font-semibold uppercase tracking-widest mt-1 font-body">Collabs</span>
            {activeView !== 'collaborations' && (
              <span className="absolute top-1 right-3.5 w-1.5 h-1.5 bg-accent-cyan rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </nav>


      {/* FIRST FOLD: PREMIUM FULLSCREEN HERO SECTION */}
      <header 
        className="relative w-full z-20 flex flex-col justify-between overflow-hidden min-h-[70vh] md:min-h-screen"
      >
        {/* Title */}
        <div 
          className={`w-full px-4 text-center mt-[15vh] sm:mt-[18vh] transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h1 className="hero-title select-none">Photo Timeline</h1>
        </div>

        {/* Center CTA block & Bottom Row elements */}
        <div 
          className={`w-full px-4 sm:px-6 md:px-10 pb-8 sm:pb-12 md:pb-16 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 sm:gap-8 z-20 transition-all duration-1000 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Left column */}
          <p className="hidden md:block text-sm font-body font-light text-white/75 max-w-[220px] leading-relaxed text-left">
            PhotoTimeline preserves your precious moments in an interactive sandbox and chronological journey.
          </p>

          {/* Center CTA block */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => {
                handleScrollToWorkspace();
              }}
              className="group relative bg-white text-black text-sm font-body font-medium rounded-full px-6 py-3 overflow-hidden active:scale-[0.97] transition-all duration-200 shadow-[0_0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.25)] hover:scale-[1.03] cursor-pointer w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center justify-center gap-1.5 font-semibold">
                Explore memories
                <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-b from-white to-white/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
            
            <button 
              onClick={() => {
                setIsAddModalOpen(true);
              }}
              className="liquid-glass group text-white text-sm font-body font-medium rounded-full px-6 py-3 active:scale-[0.97] transition-all duration-200 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_2px_rgba(255,255,255,0.07)] cursor-pointer border border-white/5 w-full sm:w-auto text-center"
            >
              Crystallize Memory
            </button>
          </div>

          {/* Right column */}
          <p className="hidden md:block text-sm font-body font-light text-white/75 max-w-[220px] leading-relaxed text-right">
            Search, filter, and collaborate on shared memories with friends and family in real-time.
          </p>
        </div>

        {/* Scroll-down indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 select-none pointer-events-none">
          <span className="text-[8px] uppercase tracking-[0.3em] text-white/25 font-body font-semibold">Scroll</span>
          <ChevronDown className="w-4 h-4 text-white/30 scroll-indicator" />
        </div>
      </header>

      {/* SECOND FOLD: INTERACTIVE WORKSPACE SECTION */}
      <section 
        id="workspace" 
        className="relative z-20 min-h-screen bg-gradient-to-b from-black/60 via-black/85 to-black/95 border-t border-white/5 py-10 sm:py-14 md:py-20 pb-28 md:pb-20"
      >
        {/* Main Grid Overlay */}
        <div className="absolute inset-0 grid-overlay pointer-events-none opacity-15" />

        {/* Ambient background glow dots - Optimized Radial Glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-radial-glow-purple rounded-full animate-glow-slow mix-blend-screen" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-radial-glow-cyan rounded-full animate-glow-slow mix-blend-screen" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-[600px] h-[600px] bg-radial-glow-pink rounded-full animate-glow-slow mix-blend-screen" style={{ animationDelay: '-4s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {activeView !== 'collaborations' ? (
            <>
              {/* Section Title & Supabase Status Badge */}
              <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pb-4">
                <div className="text-left space-y-2.5">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02] select-none">
                    <Flame className="w-3.5 h-3.5 text-white/60 animate-pulse" />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/50 font-body">
                      Antigravity Physics Simulation
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading italic text-white leading-none font-light select-none tracking-tight break-words">
                      {workspaceTitle}
                    </h2>
                    
                    {/* Reset scope button back to personal timeline */}
                    {(activeFolderId || activeRoomId) && (
                      <button 
                        onClick={() => {
                          setActiveFolderId(null);
                          setActiveRoomId(null);
                          if (window.location.search) {
                            window.history.pushState({}, '', window.location.pathname);
                          }
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/5 text-[9px] font-semibold uppercase tracking-widest text-white/50 hover:text-white cursor-pointer select-none transition-all"
                      >
                        <span>← Exit Shared Space</span>
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[10px] md:text-xs font-body font-light tracking-[0.25em] text-white/40 uppercase select-none">
                    {workspaceSubtitle}
                  </p>
                </div>

                {/* Premium Supabase Status Micro-Badge */}
                <div className="liquid-glass flex flex-wrap items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 rounded-2xl sm:rounded-full border border-white/5 text-[9px] sm:text-[10px] text-white/40 select-none bg-white/[0.01]">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="uppercase tracking-widest font-semibold text-white/60">Live</span>
                  </div>
                  <div className="hidden sm:block w-px h-3 bg-white/10" />
                  <div className="hidden sm:flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-white/40" />
                    <span className="uppercase tracking-widest">RLS</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <span>{memories.length} memories</span>
                </div>
              </div>

              {/* Crystallize Action Button (tab selector removed — navbar handles view switching) */}
              <section className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setIsAddModalOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 liquid-glass-strong text-white font-semibold text-[10px] uppercase tracking-widest border border-white/10 hover:border-white/25 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-full cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                >
                  <Plus className="w-4 h-4 text-white/80" />
                  <span>Crystallize Memory</span>
                </button>
              </section>

              {/* Integrated Search & Filter capsule */}
              <section className="liquid-glass p-3 sm:p-4 md:p-2.5 rounded-2xl md:rounded-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 px-4 sm:px-6 bg-white/[0.01]">
                {/* Search Box */}
                <div className="relative w-full md:w-80 flex items-center">
                  <Search className="absolute left-3.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-transparent text-white placeholder-white/25 text-xs focus:outline-none transition-all font-body font-light tracking-wide border-none outline-none"
                  />
                </div>

                {/* Separator Line */}
                <div className="hidden md:block w-px h-5 bg-white/10" />
                <div className="block md:hidden w-full h-px bg-white/5" />

                {/* Category Pills */}
                <div className="scroll-fade-container">
                  <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scroll-smooth whitespace-nowrap pr-10">
                    <span className="text-[8px] font-semibold uppercase tracking-[0.25em] text-white/20 mr-1 flex-shrink-0 select-none">
                      Filter:
                    </span>
                    {['All', 'Travel', 'Nature', 'Relationship', 'Tech', 'Life'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-body tracking-[0.1em] transition-all duration-300 flex-shrink-0 cursor-pointer border ${
                          selectedCategory === cat
                            ? 'bg-white/15 border-white/20 text-white font-medium shadow-md scale-[0.98]'
                            : 'bg-transparent border-transparent text-white/40 hover:text-white/70'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Core Workspace View Feed */}
              <main className="w-full relative min-h-[400px]">
                {error && (
                  <div className="liquid-glass border border-white/10 text-white/70 text-xs px-6 py-3.5 rounded-full flex items-center justify-between gap-3 mb-6 bg-white/[0.02]">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="font-light tracking-wide">{error}</span>
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="text-[9px] uppercase tracking-widest hover:text-white underline cursor-pointer"
                    >
                      Reconnect
                    </button>
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center p-28 space-y-4">
                    <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-body font-light select-none">
                      Decrypting Memory Matrix...
                    </span>
                  </div>
                ) : activeView === 'sandbox' ? (
                  <PhysicsSandbox 
                    memories={filteredMemories} 
                    onSelectMemory={setSelectedMemory} 
                  />
                ) : (
                  <MemoryTimeline 
                    memories={filteredMemories} 
                    onSelectMemory={setSelectedMemory} 
                  />
                )}
              </main>
            </>
          ) : (
            <CollaborationsPage
              friendships={friendships}
              sharedFolders={sharedFolders}
              activeFolderId={activeFolderId}
              setActiveFolderId={setActiveFolderId}
              sendFriendRequest={sendFriendRequest}
              respondToFriendRequest={respondToFriendRequest}
              currentUserId={user?.id}
              currentUserEmail={user?.email}
              onEnterWorkspace={() => {
                setActiveView('sandbox');
                handleScrollToWorkspace();
              }}
            />
          )}
        </div>
      </section>

      {/* Floating Add Memory Form Modal */}
      {isAddModalOpen && (
        <AddMemoryModal 
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleEnrichedAddMemory}
        />
      )}

      {/* Expand Memory Detail Dialog Modal */}
      {selectedMemory && (
        <MemoryDetailModal 
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onDelete={deleteMemory}
        />
      )}

      {/* Premium Profile Settings Modal */}
      {isSettingsOpen && (
        <ProfileSettingsModal
          user={user}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Antigravity Boomerang Dashboard Controller Widget */}
      {accessGranted && framesReady && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-40 animate-fade-in pointer-events-auto select-none">
          {hudVisible ? (
            <div className="liquid-glass p-3.5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md flex flex-col space-y-2.5 w-[190px] shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
              {/* Widget Header */}
              <div className="flex justify-between items-center w-full">
                <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  Boomerang Engine
                </span>
                <button
                  onClick={() => setHudVisible(false)}
                  className="text-white/30 hover:text-white/70 transition-colors cursor-pointer text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                >
                  Hide
                </button>
              </div>

              {/* Speed Preset Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'slow', label: '0.5x Slow' },
                  { value: 'standard', label: '1.0x Std' },
                  { value: 'fast', label: '1.6x Fast' },
                  { value: 'dynamic', label: 'Dynamic' }
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setBoomerangSpeed(preset.value as any)}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-body tracking-wider transition-all duration-300 cursor-pointer border ${
                      boomerangSpeed === preset.value
                        ? 'bg-white text-black border-white font-medium scale-[0.98]'
                        : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Micro Divider */}
              <div className="w-full h-px bg-white/10" />

              {/* Live Diagnostics Metrics */}
              <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-white/40">
                <div className="flex items-center space-x-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-cyan"></span>
                  </span>
                  <span>{activeFPS} FPS</span>
                </div>
                <span>{corsBlocked ? 'FALLBACK' : '⟳ LOOP'}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setHudVisible(true)}
              className="p-2.5 rounded-full liquid-glass border border-white/10 bg-black/45 backdrop-blur-md text-white/60 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)] cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          )}
        </div>
      )}

        </>
      )}
    </div>
  );
}
