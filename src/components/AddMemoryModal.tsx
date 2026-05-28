import { useState, useEffect } from 'react';
import { X, Calendar, Image as ImageIcon, Sparkles, Paintbrush, Upload, Check, Loader2 } from 'lucide-react';
import type { MemoryMetadata } from '../hooks/useMemories';

export interface AddMemoryModalProps {
  onClose: () => void;
  onSubmit: (metadata: MemoryMetadata, imageUrl: string | null, date: string) => Promise<any>;
}

// Pre-curated premium high-res image presets for quick visual wow factor
export const CATEGORY_PRESETS = {
  Travel: [
    { name: 'Tokyo Neon', url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=800&q=80' },
    { name: 'Sunset Coast', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' }
  ],
  Nature: [
    { name: 'Mystic Forest', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80' },
    { name: 'Emerald Lake', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80' }
  ],
  Relationship: [
    { name: 'Warm Lights', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80' },
    { name: 'City Spark', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80' }
  ],
  Tech: [
    { name: 'Cyber Grid', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Virtual Sphere', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' }
  ],
  Life: [
    { name: 'Golden Peak', url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80' },
    { name: 'Cozy Morning', url: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&w=800&q=80' }
  ]
};

export const COLOR_PRESETS = [
  { name: 'Cyan Glow', value: '#00f2fe' },
  { name: 'Neon Purple', value: '#7f00ff' },
  { name: 'Hot Pink', value: '#f857a6' },
  { name: 'Sunset Gold', value: '#f7971e' },
  { name: 'Electric Green', value: '#39ff14' }
];

export function AddMemoryModal({ onClose, onSubmit }: AddMemoryModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryMetadata['category']>('Life');
  const [color, setColor] = useState('#00f2fe');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [imageSource, setImageSource] = useState<'presets' | 'device' | 'url'>('presets');
  const [customUrl, setCustomUrl] = useState('');
  const [uploadedImageBase64, setUploadedImageBase64] = useState('');
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [selectedPresetUrl, setSelectedPresetUrl] = useState(CATEGORY_PRESETS.Life[0].url);
  const [tagsString, setTagsString] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCategoryChange = (cat: MemoryMetadata['category']) => {
    setCategory(cat);
    const presets = CATEGORY_PRESETS[cat];
    if (presets && presets.length > 0) {
      setSelectedPresetUrl(presets[0].url);
    }
  };

  const processSelectedFile = (file: File) => {
    setIsProcessingImage(true);
    setFormError('');
    setUploadedImageName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Offscreen canvas compression to 800px size for performant Base64 storage
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setUploadedImageBase64(compressedBase64);
        } else {
          setUploadedImageBase64(event.target?.result as string);
        }
        setIsProcessingImage(false);
      };
      
      img.onerror = () => {
        setIsProcessingImage(false);
        setFormError('Failed to parse the selected image file.');
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessingImage(false);
      setFormError('Failed to read the selected file.');
    };

    reader.readAsDataURL(file);
  };

  const handleDeviceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processSelectedFile(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a title for your memory.');
      return;
    }
    if (!content.trim()) {
      setFormError('Please capture some thoughts for your memory.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      let imageUrl = '';
      if (imageSource === 'presets') {
        imageUrl = selectedPresetUrl;
      } else if (imageSource === 'device') {
        imageUrl = uploadedImageBase64;
        if (!imageUrl) {
          setFormError('Please select an image from your device to crystallize.');
          setIsSubmitting(false);
          return;
        }
      } else {
        imageUrl = customUrl;
        if (!imageUrl.trim()) {
          setFormError('Please provide a direct URL for your custom image.');
          setIsSubmitting(false);
          return;
        }
      }

      // Convert comma-separated string to list
      const tagsList = tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const metadata: MemoryMetadata = {
        title: title.trim(),
        content: content.trim(),
        category,
        color,
        tags: tagsList
      };

      await onSubmit(metadata, imageUrl || null, date);
      
      // Reset form on success
      setTitle('');
      setContent('');
      setCategory('Life');
      setColor('#00f2fe');
      setDate(new Date().toISOString().split('T')[0]);
      setImageSource('presets');
      setCustomUrl('');
      setUploadedImageBase64('');
      setUploadedImageName('');
      setTagsString('');
      setSelectedPresetUrl(CATEGORY_PRESETS.Life[0].url);
      
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPresets = CATEGORY_PRESETS[category] || [];

  // Determine active preview URL
  let livePreviewUrl = '';
  if (imageSource === 'presets') {
    livePreviewUrl = selectedPresetUrl;
  } else if (imageSource === 'device') {
    livePreviewUrl = uploadedImageBase64;
  } else {
    livePreviewUrl = customUrl;
  }

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg md:max-w-2xl liquid-glass rounded-2xl sm:rounded-3xl border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col bg-black/85 overflow-hidden cursor-default"
        style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}
      >
        {/* Glow Effects - GPU-native radial glows */}
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full mix-blend-screen animate-pulse-slow pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}1a 0%, transparent 70%)` }}
        />
        <div 
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full mix-blend-screen animate-pulse-slow pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}12 0%, transparent 70%)` }}
        />

        {/* Modal Header (fixed top) */}
        <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-white/[0.01] select-none flex-shrink-0 z-10">
          <div className="flex items-center space-x-3 select-none">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" style={{ color }} />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading italic text-white font-light tracking-tight">
              Crystallize a Memory
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/40 rounded-full hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form (scrollable middle content) */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar relative flex flex-col justify-between">
          <div className="space-y-6 flex-1">
          {formError && (
            <div className="p-3 text-[10px] uppercase tracking-wider font-semibold rounded-full border border-accent-orange/20 bg-accent-orange/10 text-accent-orange pl-5">
              {formError}
            </div>
          )}

          {/* Form Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Metadata */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none">
                  Title
                </label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. Under the Neon Grid"
                  className="w-full px-5 py-3.5 liquid-glass rounded-full text-white placeholder-white/20 focus:outline-none transition-all font-body text-xs focus:border-white/20 font-light"
                  style={{ borderColor: `${color}40`, willChange: 'transform', transform: 'translate3d(0,0,0)' }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(['Travel', 'Nature', 'Relationship', 'Tech', 'Life'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-3 py-2.5 text-[10px] tracking-wider rounded-full font-body border cursor-pointer transition-all text-center ${
                        category === cat 
                          ? 'bg-white/10 border-white/20 text-white font-semibold shadow-md' 
                          : 'bg-white/[0.01] border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none">
                  Date
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-4 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        // Fallback support
                      }
                    }}
                    className="w-full pl-11 pr-4 py-3.5 liquid-glass rounded-full text-white focus:outline-none focus:border-white/20 transition-all font-body text-xs font-light custom-date-picker cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none flex items-center">
                  <Paintbrush className="w-3 h-3 mr-1.5 text-white/40" /> Aura Color
                </label>
                <div className="flex items-center gap-2.5">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className="w-7 h-7 rounded-full border border-white/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                      style={{ 
                        backgroundColor: preset.value,
                        boxShadow: color === preset.value ? `0 0 12px ${preset.value}80` : 'none',
                        borderColor: color === preset.value ? '#ffffff' : 'rgba(255,255,255,0.2)'
                      }}
                      title={preset.name}
                    />
                  ))}
                  {/* Custom color picker */}
                  <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/20 hover:scale-105 transition-all flex items-center justify-center bg-white/5 cursor-pointer">
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 w-full h-full scale-[1.6] bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Searchable Tags Input Section */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none flex items-center">
                  <Sparkles className="w-3 h-3 mr-1.5 text-white/40" /> Searchable Tags
                </label>
                <input 
                  type="text"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                  placeholder="E.g. dream, summer, night (separated by commas)"
                  className="w-full px-5 py-3.5 liquid-glass rounded-full text-white placeholder-white/20 focus:outline-none transition-all font-body text-xs focus:border-white/20 font-light outline-none"
                  style={{ borderColor: `${color}40`, willChange: 'transform', transform: 'translate3d(0,0,0)' }}
                />
              </div>

            </div>

            {/* Right Column: Visual Theme */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none flex items-center justify-between">
                  <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1.5 text-white/30" /> Memory Canvas</span>
                  
                  {/* Source Toggle Selector Switcher */}
                  <div className="flex items-center space-x-1.5 select-none font-semibold text-[8px] tracking-wider">
                    <button
                      type="button"
                      onClick={() => setImageSource('presets')}
                      className={`uppercase transition-all cursor-pointer bg-transparent border-none outline-none ${
                        imageSource === 'presets' ? 'text-white underline decoration-2 underline-offset-4' : 'text-white/40 hover:text-white/70'
                      }`}
                      style={{ color: imageSource === 'presets' ? color : undefined }}
                    >
                      Presets
                    </button>
                    <span className="text-white/10">|</span>
                    <button
                      type="button"
                      onClick={() => setImageSource('device')}
                      className={`uppercase transition-all cursor-pointer bg-transparent border-none outline-none ${
                        imageSource === 'device' ? 'text-white underline decoration-2 underline-offset-4' : 'text-white/40 hover:text-white/70'
                      }`}
                      style={{ color: imageSource === 'device' ? color : undefined }}
                    >
                      Upload
                    </button>
                    <span className="text-white/10">|</span>
                    <button
                      type="button"
                      onClick={() => setImageSource('url')}
                      className={`uppercase transition-all cursor-pointer bg-transparent border-none outline-none ${
                        imageSource === 'url' ? 'text-white underline decoration-2 underline-offset-4' : 'text-white/40 hover:text-white/70'
                      }`}
                      style={{ color: imageSource === 'url' ? color : undefined }}
                    >
                      Link
                    </button>
                  </div>
                </label>

                {/* 1. Presets Mode Rendering */}
                {imageSource === 'presets' && (
                  <div className="grid grid-cols-2 gap-2">
                    {currentPresets.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setSelectedPresetUrl(preset.url)}
                        className={`group relative h-20 rounded-xl overflow-hidden border cursor-pointer transition-all ${
                          selectedPresetUrl === preset.url 
                            ? 'border-white/40 scale-[0.97] shadow-md' 
                            : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-2">
                          <span className="text-[9px] font-body text-white font-medium truncate w-full text-left">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Device Upload Mode Rendering */}
                {imageSource === 'device' && (
                  <div 
                    onClick={() => document.getElementById('device-image-picker')?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`liquid-glass rounded-2xl border border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 h-28 relative ${
                      isDragging 
                        ? 'bg-white/[0.04] scale-[1.02] border-white/40 shadow-lg' 
                        : 'border-white/10 hover:bg-white/[0.02] hover:border-white/20'
                    }`}
                    style={{ 
                      borderColor: isDragging 
                        ? color 
                        : uploadedImageBase64 
                          ? `${color}50` 
                          : undefined,
                      boxShadow: isDragging ? `0 0 20px ${color}20` : undefined
                    }}
                  >
                    <input 
                      id="device-image-picker"
                      type="file" 
                      accept="image/*"
                      onChange={handleDeviceImageChange}
                      className="hidden" 
                    />
                    {isProcessingImage ? (
                      <div className="flex flex-col items-center space-y-2 select-none animate-fade-in text-white/50">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
                        <p className="text-[10px] text-white/80 font-medium font-body mt-1">
                          Processing & Compressing...
                        </p>
                      </div>
                    ) : uploadedImageBase64 ? (
                      <div className="flex flex-col items-center space-y-1 select-none animate-fade-in">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center border transition-all animate-bounce"
                          style={{ 
                            backgroundColor: `${color}15`, 
                            borderColor: `${color}40`,
                            color: color
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] text-white/80 font-medium font-body truncate max-w-[180px] mt-1">
                          {uploadedImageName || 'Image selection loaded'}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2 justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById('device-image-picker')?.click();
                            }}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            Change Image
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImageBase64('');
                              setUploadedImageName('');
                            }}
                            className="px-3 py-1.5 bg-accent-orange/5 border border-accent-orange/10 hover:bg-accent-orange/15 text-accent-orange rounded-full text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center select-none text-white/30 hover:text-white/60 transition-colors duration-300">
                        <Upload className="w-5 h-5 text-white/30 mb-1 animate-pulse" style={{ color: isDragging ? color : undefined }} />
                        <p className="text-[9px] font-semibold uppercase tracking-wider font-body">
                          {isDragging ? 'Drop Image to Upload' : 'Drag & Drop Image Here'}
                        </p>
                        <p className="text-[7px] font-light mt-0.5 mb-1.5">Supports PNG, JPG, WEBP (max 5MB)</p>
                        
                        {/* High Affordance Browse Button */}
                        <div 
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-full text-[8px] uppercase tracking-wider font-semibold border transition-all flex items-center gap-1 active:scale-95 shadow-sm mt-0.5"
                          style={{
                            borderColor: `${color}30`,
                            color: color
                          }}
                        >
                          <span>Browse Device</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Custom Link Mode Rendering */}
                {imageSource === 'url' && (
                  <div className="space-y-2">
                    <input 
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      className="w-full px-5 py-3.5 liquid-glass rounded-full text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all font-body text-xs font-light outline-none"
                    />
                    <p className="text-[9px] text-white/30 italic pl-2 select-none">
                      Provide a direct web link to any secure image.
                    </p>
                  </div>
                )}

                {/* Unified Live Canvas Card Preview */}
                <div className="relative h-28 rounded-2xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center shadow-inner">
                  {livePreviewUrl ? (
                    <img 
                      src={livePreviewUrl} 
                      alt="Preset Preview" 
                      className="w-full h-full object-cover animate-pulse-slow"
                      style={{ animationDuration: '10s' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center space-y-1 text-white/15 select-none animate-pulse">
                      <ImageIcon className="w-6 h-6 text-white/20" />
                      <span className="text-[10px] font-body font-light">Preview Awaiting Image Selection</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  
                  {/* Preview Card Metadata Overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-left">
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <span 
                        className="px-1.5 py-0.5 text-[7px] font-bold rounded-full uppercase tracking-wider border inline-block"
                        style={{
                          borderColor: `${color}40`,
                          color: color,
                          backgroundColor: `${color}20`
                        }}
                      >
                        {category}
                      </span>
                      
                      {/* Live search tags badges inside card preview! */}
                      {tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 3).map(tag => (
                        <span 
                          key={tag}
                          className="px-1.5 py-0.5 text-[6px] font-medium rounded-md uppercase tracking-wider bg-white/10 border border-white/5 text-white/50 shadow-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate font-body leading-none pt-0.5">
                      {title || 'Untitled Memory'}
                    </h4>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Full Width Textarea */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/40 select-none">
              Memory Description & Narrative
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Recreate the feeling, context, soundscape, or emotion of this moment..."
              className="w-full px-5 py-4 liquid-glass rounded-2xl text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all font-body text-xs font-light resize-none leading-relaxed outline-none"
              style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}
            />
          </div>

          </div>

          {/* Sticky Glass Footer Action Bar (HCI Sticky Bottom) */}
          <div className="sticky bottom-0 bg-black/95 backdrop-blur-md pt-3 sm:pt-4 pb-2 border-t border-white/5 z-20 flex items-center justify-end gap-3 mt-4 sm:mt-6 select-none flex-shrink-0 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-white/5 hover:border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5 font-body text-[10px] uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-full text-black font-semibold font-body text-[10px] uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer disabled:opacity-50 border-none"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 20px ${color}33`
              }}
            >
              {isSubmitting ? 'Crystallizing...' : 'Crystallize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
