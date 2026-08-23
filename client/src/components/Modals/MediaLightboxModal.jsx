import React, { useEffect } from 'react';
import { X, Download, Film, Image as ImageIcon } from 'lucide-react';

export default function MediaLightboxModal({ media, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!media) return null;

  const isVideo = media.type === 'video' || (media.mimeType && media.mimeType.startsWith('video/'));

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = media.dataUrl;
    a.download = media.name || (isVideo ? 'video.mp4' : 'image.png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full max-h-[90vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70 select-none">
          <div className="flex items-center gap-2 text-slate-200 min-w-0">
            {isVideo ? (
              <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            )}
            <span className="font-medium text-xs truncate max-w-md">
              {media.name || 'Media Preview'}
            </span>
            {media.size && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({(media.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
              title="Download media file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Media Body */}
        <div className="flex-1 flex items-center justify-center p-4 bg-slate-950/90 overflow-auto min-h-[300px]">
          {isVideo ? (
            <video
              src={media.dataUrl}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg shadow-xl"
            />
          ) : (
            <img
              src={media.dataUrl}
              alt={media.name || 'Enlarged media'}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-xl select-auto"
            />
          )}
        </div>
      </div>
    </div>
  );
}
