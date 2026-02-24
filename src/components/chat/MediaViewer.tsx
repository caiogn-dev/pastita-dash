// MediaViewer - Versão simplificada
import React from 'react';
import './MediaViewer.css';

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
  onClose,
}) => {
  const isImage = type.startsWith('image/') || ['image', 'sticker'].includes(type);
  const isVideo = type.startsWith('video/') || type === 'video';
  const isAudio = type.startsWith('audio/') || type === 'audio';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    link.click();
  };

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <button onClick={handleDownload} className="viewer-btn">⬇️</button>
          <button onClick={onClose} className="viewer-btn">✕</button>
        </div>

        <div className="media-viewer-body">
          {isImage && <img src={url} alt={fileName} className="viewer-image" />}
          {isVideo && <video src={url} controls className="viewer-video" />}
          {isAudio && (
            <div className="viewer-audio">
              <div className="audio-icon">🎵</div>
              <audio src={url} controls />
              {fileName && <div className="audio-name">{fileName}</div>}
            </div>
          )}
          {!isImage && !isVideo && !isAudio && (
            <div className="viewer-document">
              <div className="doc-icon">📄</div>
              <div className="doc-name">{fileName || 'Documento'}</div>
              <a href={url} download className="doc-download">Baixar</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaViewer;
