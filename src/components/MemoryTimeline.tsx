import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, Sparkles, Eye } from 'lucide-react';
import type { Memory } from '../hooks/useMemories';

// Register ScrollTrigger plugin with GSAP
gsap.registerPlugin(ScrollTrigger);

export interface MemoryTimelineProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
}

export function MemoryTimeline({ memories, onSelectMemory }: MemoryTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Explicitly sort memories descending by date (latest first) to guarantee strict order
  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [memories]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Use gsap.context to scope all selectors to containerRef.current and easily revert
    const ctx = gsap.context(() => {
      // 1. Animate the central scroll line as the page scrolls
      const scrollLine = containerRef.current?.querySelector('#timeline-scroll-line');
      if (scrollLine) {
        gsap.fromTo(
          scrollLine,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 75%',
              end: 'bottom 25%',
              scrub: 1 // smooth scrubbing effect
            }
          }
        );
      }

      // 2. Animate cards sliding and fading in as they enter viewport
      const cards = containerRef.current?.querySelectorAll('.timeline-card');
      if (cards) {
        cards.forEach((card) => {
          // Connectors slide out
          const connector = card.querySelector('.timeline-connector');
          
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          });

          tl.fromTo(
            card,
            { opacity: 0, y: 40, scale: 0.96 },
            { 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              duration: 0.8, 
              ease: 'power3.out' 
            }
          );

          if (connector) {
            tl.fromTo(
              connector,
              { scaleX: 0 },
              { scaleX: 1, duration: 0.4, ease: 'power2.out' },
              '-=0.4'
            );
          }
        });
      }
    }, containerRef.current);

    return () => {
      // Clean up all ScrollTriggers created in this context
      ctx.revert();
    };
  }, [sortedMemories]);

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 border border-white/5 bg-white/[0.01] rounded-3xl text-center">
        <Sparkles className="w-8 h-8 text-white/20 animate-pulse mb-4" />
        <h3 className="text-2xl font-heading italic text-white/80 font-light">No memories in the fabric</h3>
        <p className="text-xs text-white/40 mt-1 max-w-sm font-body font-light leading-relaxed">
          Press the "Crystallize Memory" button to write the first real-time entry into the shared stream.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} id="timeline-container" className="relative w-full py-6 sm:py-10 px-2 sm:px-4 md:px-0 overflow-hidden">
      
      {/* Central Axis Scroll Line */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[1px] bg-white/5 pointer-events-none transform -translate-x-1/2">
        <div 
          id="timeline-scroll-line"
          className="w-full h-full bg-gradient-to-b from-accent-cyan via-accent-purple to-accent-pink origin-top scale-y-0"
        />
      </div>

      {/* Timeline Nodes */}
      <div className="relative space-y-8 sm:space-y-12 md:space-y-24">
        {sortedMemories.map((memory, index) => {
          const { id, date, image_url } = memory;
          const { title, content, category, color } = memory.parsed;
          const isLeft = index % 2 === 0;

          return (
            <div 
              key={id}
              className={`relative flex flex-col md:flex-row items-start md:items-center w-full group ${
                isLeft ? 'md:flex-row-reverse' : ''
              }`}
            >
              
              {/* Connector Dot */}
              <div 
                className="absolute left-4 md:left-1/2 top-6 md:top-1/2 w-4.5 h-4.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center border-2 bg-black transition-all duration-300"
                style={{ borderColor: color }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: color }}
                />
              </div>

              {/* Responsive Columns */}
              <div className={`w-full md:w-1/2 pl-8 sm:pl-10 md:pl-0 md:px-12 flex justify-start ${
                isLeft ? 'md:justify-start' : 'md:justify-end'
              }`}>
                <div 
                  className={`w-full max-w-lg timeline-card opacity-0 cursor-pointer`}
                  onClick={() => onSelectMemory(memory)}
                >
                  {/* Card Outer */}
                  <div 
                    className="relative liquid-glass rounded-2xl sm:rounded-3xl border border-white/5 p-4 sm:p-5 md:p-6 shadow-xl transition-all duration-500 group-hover:-translate-y-1 group-hover:border-white/20 bg-black/40"
                    style={{
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`,
                    }}
                  >
                    
                    {/* Hover Glow Behind Card */}
                    <div 
                      className="absolute inset-0 -z-10 rounded-3xl filter blur-xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 mix-blend-screen pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
                    />

                    {/* Metadata Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="px-3 py-0.5 text-[8px] font-bold rounded-full uppercase border tracking-wider"
                          style={{
                            borderColor: `${color}40`,
                            color: color,
                            backgroundColor: `${color}15`
                          }}
                        >
                          {category}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-white/30 text-xs font-body font-light select-none">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-white/20" />
                        <span>{new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Horizontal split */}
                    <div className={`flex flex-col gap-4 ${image_url ? 'sm:flex-row' : ''}`}>
                      {image_url && (
                        <div className="w-full sm:w-28 h-28 rounded-2xl overflow-hidden bg-black/30 border border-white/5 flex-shrink-0">
                          <img 
                            src={image_url} 
                            alt={title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-2 text-left">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-heading italic text-white tracking-wide leading-snug group-hover:text-accent-cyan transition-colors font-light">
                          {title}
                        </h3>
                        <p className="text-xs text-white/50 font-body font-light leading-relaxed line-clamp-3">
                          {content}
                        </p>
                        {memory.parsed.tags && memory.parsed.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {memory.parsed.tags.map((tag) => (
                              <span 
                                key={tag} 
                                className="px-2 py-0.5 rounded-full text-[8px] font-body bg-white/5 border border-white/5 text-white/40 group-hover:text-white/60 group-hover:border-white/10 transition-all select-none"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Reveal Details Hover Button */}
                    <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-[8px] uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors font-body select-none">
                      <div className="flex items-center space-x-1.5">
                        <Sparkles className="w-3 h-3" style={{ color }} />
                        <span>Aura Particle</span>
                      </div>
                      <span className="flex items-center space-x-1 font-bold">
                        <span>Reveal Memory</span>
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Card Connector Line pointing to center axis */}
                    <div 
                      className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-12 h-[1px] bg-white/10 origin-right timeline-connector ${
                        isLeft ? '-left-12 origin-left' : '-right-12 origin-right'
                      }`}
                      style={{ 
                        background: `linear-gradient(to ${isLeft ? 'right' : 'left'}, ${color}30, rgba(255,255,255,0.03))` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating Date Bubble on the opposite side of the card */}
              <div className={`hidden md:flex w-1/2 items-center ${
                isLeft ? 'px-12 justify-end' : 'px-12 justify-start'
              }`}>
                <div 
                  className="liquid-glass px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] flex items-center space-x-2.5 select-none transition-all duration-500 group-hover:scale-105 group-hover:bg-white/[0.04] group-hover:border-white/15"
                  style={{ 
                    borderColor: `${color}15`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${color}05`
                  }}
                >
                  <Calendar className="w-3.5 h-3.5" style={{ color }} />
                  <span className="font-heading italic text-xs tracking-wider text-white/80 font-light transition-colors group-hover:text-white">
                    {new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
