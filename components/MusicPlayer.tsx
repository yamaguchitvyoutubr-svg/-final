
import React, { useState, useEffect } from 'react';

interface MusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ isOpen, onClose }) => {
  const [playlistUrl, setPlaylistUrl] = useState<string>(() => localStorage.getItem('yt_playlist_url') || '');
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [isPlaylist, setIsPlaylist] = useState(false);

  const extractId = (url: string) => {
    try {
      const urlObj = new URL(url);
      const listId = urlObj.searchParams.get('list');
      if (listId) return { id: listId, type: 'list' };
      
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return { id: videoId, type: 'video' };
      
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleLoad = () => {
    const result = extractId(playlistUrl);
    if (result) {
      localStorage.setItem('yt_playlist_url', playlistUrl);
      setEmbedId(result.id);
      setIsPlaylist(result.type === 'list');
    }
  };

  useEffect(() => {
      if (playlistUrl) handleLoad();
  }, []);

  // Use nocookie domain for better reliability
  const embedBase = `https://www.youtube-nocookie.com/embed/`;
  const finalSrc = embedId 
    ? `${embedBase}${isPlaylist ? 'videoseries?list=' : ''}${embedId}&autoplay=1&loop=1&playlist=${embedId}`
    : '';

  if (!isOpen) {
      return embedId ? (
          <div className="hidden">
              <iframe
                width="1"
                height="1"
                src={finalSrc}
                title="Background Music"
                allow="autoplay; encrypted-media"
              ></iframe>
          </div>
      ) : null;
  }

  return (
    <div className="fixed bottom-20 right-6 w-80 bg-black/95 border border-slate-700 p-5 rounded-sm z-50 animate-[slideIn_0.3s_ease-out] shadow-2xl backdrop-blur-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-cyan-400 font-digital tracking-widest text-sm font-bold">BACKGROUND AUDIO</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 tracking-widest uppercase">YouTube Playlist / Video URL</label>
          <input
            type="text"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://music.youtube.com/..."
            className="bg-slate-900 border border-slate-700 p-2 text-xs text-white focus:border-cyan-500 outline-none rounded-sm font-mono placeholder:text-slate-700"
          />
        </div>

        <button
          onClick={handleLoad}
          className="w-full bg-cyan-900/30 border border-cyan-700 text-cyan-400 py-2.5 text-xs font-bold tracking-widest hover:bg-cyan-800/40 transition-all active:scale-95"
        >
          SYNC AUDIO LINK
        </button>

        <div className="space-y-2">
            <div className="text-[9px] text-slate-500 italic leading-relaxed border-l-2 border-slate-800 pl-2">
                * Error 153/150: This occurs if the video owner has disabled "Allow Embedding". Try a different playlist or standard YouTube link.
            </div>
            {playlistUrl && (
                <a 
                    href={playlistUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block text-[9px] text-cyan-700 hover:text-cyan-400 underline tracking-widest"
                >
                    LAUNCH IN YT MUSIC →
                </a>
            )}
        </div>

        {embedId && (
            <div className="mt-4 border-t border-slate-800 pt-4">
                <div className="aspect-video bg-black/50 border border-slate-800 flex items-center justify-center overflow-hidden relative">
                     <iframe
                        width="100%"
                        height="100%"
                        src={finalSrc}
                        title="YouTube Player"
                        allow="autoplay; encrypted-media"
                        className="opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
                    ></iframe>
                    <div className="absolute inset-0 pointer-events-none border border-inset border-white/5"></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
