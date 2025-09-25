import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download,
  Maximize2,
  RotateCcw
} from 'lucide-react';

interface MediaPlayerProps {
  url: string;
  type: 'image' | 'video' | 'audio';
  fileName?: string;
  className?: string;
}

export default function MediaPlayer({ url, type, fileName, className = '' }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (type === 'video' && videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (type === 'audio' && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (type === 'video' && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    } else if (type === 'audio' && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (type === 'video' && videoRef.current) {
      setDuration(videoRef.current.duration);
    } else if (type === 'audio' && audioRef.current) {
      const duration = audioRef.current.duration;
      // Handle cases where duration might be Infinity or NaN
      if (isFinite(duration) && duration > 0) {
        setDuration(duration);
      } else {
        // For WebM files, try to get duration from other events
        setDuration(0);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (type === 'video' && videoRef.current) {
      videoRef.current.currentTime = time;
    } else if (type === 'audio' && audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCanPlay = () => {
    if (type === 'audio' && audioRef.current) {
      const duration = audioRef.current.duration;
      if (isFinite(duration) && duration > 0 && duration !== Infinity) {
        setDuration(duration);
      }
    }
  };

  const handleDurationChange = () => {
    if (type === 'audio' && audioRef.current) {
      const duration = audioRef.current.duration;
      if (isFinite(duration) && duration > 0 && duration !== Infinity) {
        setDuration(duration);
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (type === 'image') {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div className="relative group">
          <img
            src={url}
            alt={fileName || 'Image'}
            className="w-full h-auto max-h-96 object-contain"
            loading="lazy"
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {fileName && (
          <div className="p-2 text-sm text-gray-600 truncate">
            {fileName}
          </div>
        )}
      </Card>
    );
  }

  if (type === 'video') {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div className="relative group">
          <video
            ref={videoRef}
            src={url}
            className="w-full h-auto max-h-96"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            poster=""
          />
          
          {/* Video Controls - Always visible with responsive design */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
            {/* Main controls row */}
            <div className="p-2 min-h-[50px] flex items-center">
              <div className="flex items-center space-x-1 text-white w-full">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePlayPause}
                  className="text-white hover:bg-white/20 flex-shrink-0 p-1"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMute}
                  className="text-white hover:bg-white/20 flex-shrink-0 p-1"
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </Button>
                
                <div className="flex-1 flex items-center space-x-1 min-w-0 px-1">
                  <span className="text-xs whitespace-nowrap text-white/90">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer min-w-[40px] hover:bg-white/50 transition-colors"
                    aria-label="Video progress"
                  />
                  <span className="text-xs whitespace-nowrap text-white/90">{formatTime(duration)}</span>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20 flex-shrink-0 p-1"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Compact controls for very small videos */}
            <div className="px-2 pb-1 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-white/80">{fileName || 'Video'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-white/80">
                  {Math.round((currentTime / duration) * 100) || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {fileName && (
          <div className="p-2 text-sm text-gray-600 truncate bg-gray-50">
            {fileName}
          </div>
        )}
      </Card>
    );
  }

  if (type === 'audio') {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="rounded-full w-12 h-12"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMute}
                className="p-1"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={isFinite(duration) && duration > 0 ? duration : 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                aria-label="Audio progress"
                disabled={!isFinite(duration) || duration <= 0}
              />
              <span className="text-sm text-gray-600">
                {isFinite(duration) && duration > 0 ? formatTime(duration) : '--:--'}
              </span>
            </div>
            
            {fileName && (
              <div className="text-sm text-gray-600 truncate">
                {fileName}
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="p-2"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
        
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onDurationChange={handleDurationChange}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
        />
      </Card>
    );
  }

  return null;
}
