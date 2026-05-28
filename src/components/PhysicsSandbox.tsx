import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Calendar, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { Memory } from '../hooks/useMemories';

export interface PhysicsSandboxProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
}



export function PhysicsSandbox({ memories, onSelectMemory }: PhysicsSandboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const wallsRef = useRef<{ left: Matter.Body; right: Matter.Body; top: Matter.Body; bottom: Matter.Body } | null>(null);
  
  const bodiesMapRef = useRef<Map<string, Matter.Body>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  // Card dimensions for physics body creation dynamically computed based on viewport width
  const isMobile = dimensions.width < 768;
  const isXs = dimensions.width < 400;
  const cardWidth = isXs ? 110 : isMobile ? 130 : 170;
  const cardHeight = isXs ? 140 : isMobile ? 165 : 210;

  // 1. Handle window resizing State
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || window.innerHeight - 200;
      setDimensions({ width, height });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 2. Initialize Matter.js Physics World (ONCE ON MOUNT)
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || window.innerHeight - 200;

    const { Engine, Render, Runner, World, Bodies, Events, Body } = Matter;

    // Create engine & world
    const engine = Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0; // micro-gravity / zero-gravity simulation
    engineRef.current = engine;

    // Create renderer (transparent background, standard wireframes off)
    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
        showVelocity: false,
        showSleeping: false
      }
    });
    renderRef.current = render;
    Render.run(render);

    // Create runner
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Create boundaries to contain the memory nodes
    const wallThickness = 100;
    const wallOptions = { 
      isStatic: true,
      render: { visible: false }
    };

    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, wallOptions);
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, wallOptions);
    const topWall = Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, wallOptions);
    const bottomWall = Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, wallOptions);

    World.add(engine.world, [leftWall, rightWall, topWall, bottomWall]);
    wallsRef.current = { left: leftWall, right: rightWall, top: topWall, bottom: bottomWall };

    // Gentle central vortex force + random float movement on every frame
    const handleAfterUpdate = () => {
      const currentWidth = render.options.width || 800;
      const currentHeight = render.options.height || 600;
      const bodies = bodiesMapRef.current;

      bodies.forEach((body) => {
        if (body.isStatic) return;

        // Force towards center to prevent clustering on edges
        const dx = currentWidth / 2 - body.position.x;
        const dy = currentHeight / 2 - body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Extremely subtle scaling force
        const vortexForce = 0.000003;
        const floatMagnitude = 0.000005;

        Body.applyForce(body, body.position, {
          x: (dx / (dist || 1)) * vortexForce + (Math.random() - 0.5) * floatMagnitude,
          y: (dy / (dist || 1)) * vortexForce + (Math.random() - 0.5) * floatMagnitude
        });

        // Gently damp velocity to prevent endless chaotic speed builds
        Body.setVelocity(body, {
          x: body.velocity.x * 0.99,
          y: body.velocity.y * 0.99
        });
        
        // Gently damp angular velocity too
        Body.setAngularVelocity(body, body.angularVelocity * 0.98);
      });

      // Synchronize body positions directly to DOM element transforms (Bypasses React entirely for 120 FPS!)
      bodies.forEach((body, memoryId) => {
        const cardEl = cardRefs.current.get(memoryId);
        if (cardEl) {
          const x = body.position.x;
          const y = body.position.y;
          const angle = body.angle;
          
          // Use modern container card sizes
          const currentIsXs = currentWidth < 400;
          const currentIsMobile = currentWidth < 768;
          const currentCardWidth = currentIsXs ? 110 : currentIsMobile ? 130 : 170;
          const currentCardHeight = currentIsXs ? 140 : currentIsMobile ? 165 : 210;

          cardEl.style.transform = `translate3d(${x - currentCardWidth / 2}px, ${y - currentCardHeight / 2}px, 0px) rotate(${angle}rad)`;
        }
      });
    };

    Events.on(engine, 'afterUpdate', handleAfterUpdate);
    setEngineReady(true);

    return () => {
      setEngineReady(false);
      Events.off(engine, 'afterUpdate', handleAfterUpdate);
      Runner.stop(runner);
      Render.stop(render);
      World.clear(engine.world, false);
      Engine.clear(engine);
      bodiesMapRef.current.clear();
      wallsRef.current = null;
    };
  }, []);

  // 3. Dynamic non-destructive resize logic for renderer & boundary walls
  useEffect(() => {
    const render = renderRef.current;
    if (!engineReady || !render) return;

    const { width, height } = dimensions;
    const { Body } = Matter;

    // Update renderer options
    render.options.width = width;
    render.options.height = height;
    render.canvas.width = width;
    render.canvas.height = height;

    // Move boundaries to perfectly encompass new window dimensions
    const wallThickness = 100;
    if (wallsRef.current) {
      const { left, right, top, bottom } = wallsRef.current;
      Body.setPosition(left, { x: -wallThickness / 2, y: height / 2 });
      Body.setPosition(right, { x: width + wallThickness / 2, y: height / 2 });
      Body.setPosition(top, { x: width / 2, y: -wallThickness / 2 });
      Body.setPosition(bottom, { x: width / 2, y: height + wallThickness / 2 });
    }

    // Clamp existing card bodies directly inside new boundaries
    bodiesMapRef.current.forEach((body) => {
      const paddingX = cardWidth / 2 + 10;
      const paddingY = cardHeight / 2 + 10;
      const clampedX = Math.max(paddingX, Math.min(width - paddingX, body.position.x));
      const clampedY = Math.max(paddingY, Math.min(height - paddingY, body.position.y));
      Body.setPosition(body, { x: clampedX, y: clampedY });
      Body.setVelocity(body, { x: body.velocity.x * 0.5, y: body.velocity.y * 0.5 }); // settle drift
    });
  }, [dimensions, cardWidth, cardHeight, engineReady]);

  // 4. Keep Matter.js bodies in sync with the memories array
  useEffect(() => {
    const engine = engineRef.current;
    if (!engineReady || !engine) return;

    const { World, Bodies, Body, Composite } = Matter;
    const currentBodiesMap = bodiesMapRef.current;

    // Track active memory IDs
    const activeIds = new Set(memories.map((m) => m.id));

    // Remove deleted memory bodies
    currentBodiesMap.forEach((body, id) => {
      if (!activeIds.has(id)) {
        Composite.remove(engine.world, body);
        currentBodiesMap.delete(id);
      }
    });

    // Add new memory bodies
    memories.forEach((memory) => {
      if (!currentBodiesMap.has(memory.id)) {
        // Spawn randomly scattered near center to prevent edge clustering
        const spawnX = dimensions.width / 2 + (Math.random() - 0.5) * (dimensions.width * 0.4);
        const spawnY = dimensions.height / 2 + (Math.random() - 0.5) * (dimensions.height * 0.4);

        const newBody = Bodies.rectangle(
          spawnX,
          spawnY,
          cardWidth,
          cardHeight,
          {
            frictionAir: 0.05,
            restitution: 0.6, // Bounciness
            density: 0.001,
            label: memory.id
          }
        );

        // Apply a gentle initial spin & drift direction
        Body.setAngularVelocity(newBody, (Math.random() - 0.5) * 0.03);
        Body.setVelocity(newBody, {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        });

        World.add(engine.world, newBody);
        currentBodiesMap.set(memory.id, newBody);
      }
    });
  }, [memories, cardWidth, cardHeight, engineReady, dimensions]);

  // Direct Drag Tracking Refs for smooth micro-gravity bridge
  interface DragInfo {
    body: Matter.Body;
    offsetX: number;
    offsetY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
  }

  const dragInfoRef = useRef<DragInfo | null>(null);
  const draggedOccurred = useRef<boolean>(false);
  const dragStartCoords = useRef<{ x: number; y: number } | null>(null);

  // Mouse Drag Event Listener
  const handleCardMouseDown = (e: React.MouseEvent, memory: Memory) => {
    if (e.button !== 0) return; // Only left-clicks drag
    
    const body = bodiesMapRef.current.get(memory.id);
    if (!body) return;

    const container = containerRef.current;
    if (!container) return;

    draggedOccurred.current = false;
    dragStartCoords.current = { x: e.clientX, y: e.clientY };

    const rect = container.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    dragInfoRef.current = {
      body,
      offsetX: localX - body.position.x,
      offsetY: localY - body.position.y,
      lastX: body.position.x,
      lastY: body.position.y,
      lastTime: performance.now(),
      vx: 0,
      vy: 0
    };

    // Temporarily clear velocity during capture
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      const dragInfo = dragInfoRef.current;
      if (!dragInfo) return;

      if (dragStartCoords.current) {
        const dx = moveEvent.clientX - dragStartCoords.current.x;
        const dy = moveEvent.clientY - dragStartCoords.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 4) {
          draggedOccurred.current = true;
        }
      }

      const activeRect = container.getBoundingClientRect();
      const activeLocalX = moveEvent.clientX - activeRect.left;
      const activeLocalY = moveEvent.clientY - activeRect.top;

      const targetX = activeLocalX - dragInfo.offsetX;
      const targetY = activeLocalY - dragInfo.offsetY;

      // Clamp target inside container boundaries so card stays on canvas screen
      const paddingX = cardWidth / 2 + 5;
      const paddingY = cardHeight / 2 + 5;
      const clampedX = Math.max(paddingX, Math.min(activeRect.width - paddingX, targetX));
      const clampedY = Math.max(paddingY, Math.min(activeRect.height - paddingY, targetY));

      const now = performance.now();
      const dt = Math.max(1, now - dragInfo.lastTime);
      
      // Calculate instantaneous throw velocity (vx, vy)
      const instantVx = (clampedX - dragInfo.lastX) / dt * 16.6;
      const instantVy = (clampedY - dragInfo.lastY) / dt * 16.6;

      // Set coordinates directly in physics engine
      Matter.Body.setPosition(dragInfo.body, { x: clampedX, y: clampedY });
      Matter.Body.setVelocity(dragInfo.body, { x: instantVx * 0.15, y: instantVy * 0.15 });

      dragInfo.lastX = clampedX;
      dragInfo.lastY = clampedY;
      dragInfo.lastTime = now;
      dragInfo.vx = instantVx;
      dragInfo.vy = instantVy;
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);

      const dragInfo = dragInfoRef.current;
      if (!dragInfo) return;

      // Apply inertial throw velocity capped at standard bounds
      const throwSpeedLimit = 16;
      const vx = Math.max(-throwSpeedLimit, Math.min(throwSpeedLimit, dragInfo.vx * 0.88));
      const vy = Math.max(-throwSpeedLimit, Math.min(throwSpeedLimit, dragInfo.vy * 0.88));

      Matter.Body.setVelocity(dragInfo.body, { x: vx, y: vy });
      // Apply beautiful micro-gravity random spin
      Matter.Body.setAngularVelocity(dragInfo.body, (Math.random() - 0.5) * 0.09);

      dragInfoRef.current = null;
      dragStartCoords.current = null;

      // Reset drag flag shortly to clear click triggers
      setTimeout(() => {
        draggedOccurred.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  // Mobile Touch Drag Event Listener (Scroll prevention active)
  const handleCardTouchStart = (e: React.TouchEvent, memory: Memory) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];

    const body = bodiesMapRef.current.get(memory.id);
    if (!body) return;

    const container = containerRef.current;
    if (!container) return;

    draggedOccurred.current = false;
    dragStartCoords.current = { x: touch.clientX, y: touch.clientY };

    const rect = container.getBoundingClientRect();
    const localX = touch.clientX - rect.left;
    const localY = touch.clientY - rect.top;

    dragInfoRef.current = {
      body,
      offsetX: localX - body.position.x,
      offsetY: localY - body.position.y,
      lastX: body.position.x,
      lastY: body.position.y,
      lastTime: performance.now(),
      vx: 0,
      vy: 0
    };

    // Temporarily clear velocity during touch grab
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);

    const handleWindowTouchMove = (moveEvent: TouchEvent) => {
      const dragInfo = dragInfoRef.current;
      if (!dragInfo || moveEvent.touches.length === 0) return;
      const moveTouch = moveEvent.touches[0];

      // Prevent native page scrolling while actively throwing sandbox nodes
      if (moveEvent.cancelable) moveEvent.preventDefault();

      if (dragStartCoords.current) {
        const dx = moveTouch.clientX - dragStartCoords.current.x;
        const dy = moveTouch.clientY - dragStartCoords.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 4) {
          draggedOccurred.current = true;
        }
      }

      const activeRect = container.getBoundingClientRect();
      const activeLocalX = moveTouch.clientX - activeRect.left;
      const activeLocalY = moveTouch.clientY - activeRect.top;

      const targetX = activeLocalX - dragInfo.offsetX;
      const targetY = activeLocalY - dragInfo.offsetY;

      const paddingX = cardWidth / 2 + 5;
      const paddingY = cardHeight / 2 + 5;
      const clampedX = Math.max(paddingX, Math.min(activeRect.width - paddingX, targetX));
      const clampedY = Math.max(paddingY, Math.min(activeRect.height - paddingY, targetY));

      const now = performance.now();
      const dt = Math.max(1, now - dragInfo.lastTime);
      const instantVx = (clampedX - dragInfo.lastX) / dt * 16.6;
      const instantVy = (clampedY - dragInfo.lastY) / dt * 16.6;

      Matter.Body.setPosition(dragInfo.body, { x: clampedX, y: clampedY });
      Matter.Body.setVelocity(dragInfo.body, { x: instantVx * 0.15, y: instantVy * 0.15 });

      dragInfo.lastX = clampedX;
      dragInfo.lastY = clampedY;
      dragInfo.lastTime = now;
      dragInfo.vx = instantVx;
      dragInfo.vy = instantVy;
    };

    const handleWindowTouchEnd = () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);

      const dragInfo = dragInfoRef.current;
      if (!dragInfo) return;

      const throwSpeedLimit = 16;
      const vx = Math.max(-throwSpeedLimit, Math.min(throwSpeedLimit, dragInfo.vx * 0.88));
      const vy = Math.max(-throwSpeedLimit, Math.min(throwSpeedLimit, dragInfo.vy * 0.88));

      Matter.Body.setVelocity(dragInfo.body, { x: vx, y: vy });
      Matter.Body.setAngularVelocity(dragInfo.body, (Math.random() - 0.5) * 0.09);

      dragInfoRef.current = null;
      dragStartCoords.current = null;

      setTimeout(() => {
        draggedOccurred.current = false;
      }, 50);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
  };

  const handleCardClick = (e: React.MouseEvent, memory: Memory) => {
    // If a drag operation was performed, prevent opening the details modal
    if (draggedOccurred.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelectMemory(memory);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[350px] sm:h-[450px] md:h-[600px] lg:h-[750px] bg-dark-950/40 border border-white/5 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] grid-overlay select-none"
    >
      {/* Absolute canvas matching sizes */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-auto"
      />

      {/* Floating HTML React Overlay layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
        {memories.map((memory) => {
          const { id } = memory;
          const { parsed, image_url, date } = memory;
          const { title, content, category, color } = parsed;
          const isHovered = activeHoverId === id;

          return (
            <div
              key={id}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(id, el);
                } else {
                  cardRefs.current.delete(id);
                }
              }}
              className="pointer-events-auto cursor-grab active:cursor-grabbing select-none"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                transformOrigin: 'center center',
                transition: isHovered ? 'scale 0.2s ease-out, shadow 0.2s ease-out' : 'none',
                scale: isHovered ? '1.04' : '1',
                zIndex: isHovered ? 10 : 1,
                willChange: 'transform',
                // Set initial transform out of bounds until first physics frame paints
                transform: `translate3d(-9999px, -9999px, 0px)`
              }}
              onMouseEnter={() => setActiveHoverId(id)}
              onMouseLeave={() => setActiveHoverId(null)}
              onMouseDown={(e) => handleCardMouseDown(e, memory)}
              onTouchStart={(e) => handleCardTouchStart(e, memory)}
              onClick={(e) => handleCardClick(e, memory)}
            >
              {/* Premium Polaroid-style Card Wrapper */}
              <div 
                className="w-full h-full liquid-glass rounded-2xl flex flex-col p-2 shadow-2xl transition-all bg-black/50"
                style={{
                  borderColor: isHovered ? `${color}40` : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: isHovered 
                    ? `0 0 25px ${color}15, inset 0 1px 1px rgba(255,255,255,0.15)`
                    : 'inset 0 1px 1px rgba(255,255,255,0.03)'
                }}
              >
                {/* Aura Glow Indicator */}
                <div 
                  className="absolute -top-10 -left-10 w-24 h-24 rounded-full filter blur-2xl opacity-10 pointer-events-none mix-blend-screen"
                  style={{ backgroundColor: color }}
                />

                {/* Media frame */}
                <div className={`relative w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0 ${
                  isMobile ? 'h-20' : 'h-28'
                }`}>
                  {image_url ? (
                    <img 
                      src={image_url} 
                      alt={title} 
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 opacity-30 select-none">
                      <ImageIcon className="w-4 h-4 text-white" />
                      <span className="text-[6px] uppercase tracking-widest text-white font-semibold">Pure Text</span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                  {/* Category Badge overlay */}
                  <span 
                    className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[7px] font-bold rounded-full uppercase tracking-wider border select-none scale-90 origin-top-left"
                    style={{ 
                      borderColor: `${color}40`,
                      color: color,
                      backgroundColor: `${color}20`
                    }}
                  >
                    {category}
                  </span>
                </div>

                {/* Caption / Content section */}
                <div className="flex-1 mt-2 flex flex-col justify-between overflow-hidden text-left">
                  <div className="space-y-1 overflow-hidden">
                    <h4 className={`font-semibold text-white font-body tracking-wide truncate leading-tight select-none ${
                      isMobile ? 'text-[10px]' : 'text-xs'
                    }`}>
                      {title}
                    </h4>
                    <p className={`text-white/40 leading-relaxed font-body font-light overflow-hidden select-none ${
                      isMobile ? 'text-[8px] line-clamp-1' : 'text-[10px] line-clamp-2'
                    }`}>
                      {content}
                    </p>
                    {parsed.tags && parsed.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 select-none overflow-hidden max-h-5">
                        {parsed.tags.slice(0, 2).map((tag) => (
                          <span 
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[6px] sm:text-[7px] text-white/40 font-body transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between text-[8px] text-white/20 pt-1.5 border-t border-white/5 select-none font-body font-light">
                    <div className="flex items-center">
                      <Calendar className="w-2.5 h-2.5 mr-1 text-white/20" />
                      <span>{new Date(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <Sparkles className="w-2.5 h-2.5" style={{ color }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State overlay */}
      {memories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className="liquid-glass rounded-[24px] p-8 border border-white/5 bg-black/60 shadow-2xl max-w-sm text-center pointer-events-auto backdrop-blur-md">
            <Sparkles className="w-8 h-8 text-accent-cyan/60 animate-pulse mx-auto mb-4" />
            <h3 className="text-2xl font-heading italic text-white/80 font-light select-none">Shared Sandbox is Empty</h3>
            <p className="text-xs text-white/40 mt-2 font-body font-light leading-relaxed select-none">
              Start capturing your collaborative timeline! Click the "Crystallize Memory" button to float your first photo card in zero gravity.
            </p>
          </div>
        </div>
      )}


      {/* Zero gravity instructions overlay */}
      <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 pointer-events-none flex items-center justify-between bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/5 max-w-sm mx-auto md:max-w-none md:mx-0">
        <div className="flex items-center space-x-2">
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-cyan"></span>
          </div>
          <p className="text-[8px] sm:text-[10px] text-white/40 font-body tracking-wider">
            Drag cards to throw • Click to expand
          </p>
        </div>
        <span className="hidden md:inline px-3 py-0.5 text-[8px] font-bold uppercase tracking-widest text-accent-cyan border border-accent-cyan/20 rounded-full bg-accent-cyan/5">
          Micro-gravity Sandbox
        </span>
      </div>
    </div>
  );
}
