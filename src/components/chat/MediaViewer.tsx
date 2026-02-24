/**
 * MediaViewer - Modal para visualizar imagens, vídeos, áudio e documentos
 * 
 * Melhorias:
 * - Player de áudio funcional com controles
 * - Download de arquivos corrigido
 * - Visualização de vídeos melhorada
 * - Zoom em imagens
 * - Responsividade melhorada
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  DocumentIcon,
  FilmIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';

export interface MediaViewerProps {
  url: string;
  type: string;
  fileName?: string;
  mimeType?: string;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  url,
  type,
  fileName,
  mimeType,
  onClose,
}) => {
  const isImage = type.startsWith('image/') || ['image', 'sticker'].includes(type);
  const isVideo = type.startsWith('video/') || type === 'video';
  const isAudio = type.startsWith('audio/') || type === 'audio';
  const isDocument = !isImage && !isVideo && !isAudio;

  // Estados para áudio
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Estados para imagem
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handler para download
  const handleDownload = async () => {
    try {
      // Fazer fetch do arquivo para garantir que funcione com URLs externas
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Criar URL do blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link e clicar
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL do blob
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      // Fallback: tentar download direto
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handlers de áudio
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  // Handlers de imagem (zoom e pan)
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Formatar tempo
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3 text-white">
          {isImage && <PhotoIcon className="w-6 h-6" />}
          {isVideo && <FilmIcon className="w-6 h-6" />}
          {isAudio && <SpeakerWaveIcon className="w-6 h-6" />}
          {isDocument && <DocumentIcon className="w-6 h-6" />}
          <span className="text-sm font-medium truncate max-w-md">
            {fileName || 'Visualizador de Mídia'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Controles de zoom para imagens */}
          {isImage && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Diminuir zoom"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              </button>
              <span className="text-white/80 text-sm min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Aumentar zoom"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Resetar zoom"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Baixar"
          >
            <ArrowDownTrayIcon className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fechar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-4 pt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <div 
            className="relative overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <img
              ref={imageRef}
              src={url}
              alt={fileName || 'Imagem'}
              className="max-w-full max-h-[85vh] object-contain transition-transform"
              style={{
                transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              draggable={false}
            />
          </div>
        )}

        {isVideo && (
          <video
            src={url}
            controls
            className="max-w-full max-h-[85vh] rounded-lg"
            autoPlay
            playsInline
          >
            Seu navegador não suporta vídeos.
          </video>
        )}

        {isAudio && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            {/* Ícone de áudio grande */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <SpeakerWaveIcon className="w-12 h-12 text-white" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white text-center truncate max-w-full">
                {fileName || 'Áudio'}
              </p>
            </div>

            {/* Player de áudio customizado */}
            <audio
              ref={audioRef}
              src={url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            {/* Barra de progresso */}
            <div className="mb-4">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controles */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlay}
                className="w-16 h-16 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <PauseIcon className="w-8 h-8" />
                ) : (
                  <PlayIcon className="w-8 h-8 ml-1" />
                )}
              </button>
            </div>

            {/* Controle de volume */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={toggleMute}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {isMuted || volume === 0 ? (
                  <SpeakerXMarkIcon className="w-5 h-5" />
                ) : (
                  <SpeakerWaveIcon className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          </div>
        )}

        {isDocument && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 text-center max-w-md w-full mx-4">
            <DocumentIcon className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {fileName || 'Documento'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Este arquivo não pode ser visualizado diretamente
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Baixar Arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
