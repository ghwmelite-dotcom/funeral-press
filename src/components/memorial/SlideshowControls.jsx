import { Play, Pause, SkipBack, SkipForward, Music, Video, Download, Square } from 'lucide-react'
import { useRef } from 'react'

export default function SlideshowControls({
  slideshow,
  recorder,
  canvasRef,
  audioRef,
}) {
  const musicInputRef = useRef(null)

  const handleMusicUpload = (e) => {
    const file = e.target.files[0]
    if (file) slideshow.loadMusic(file)
    e.target.value = ''
  }

  const handleRecord = () => {
    if (recorder.recording) {
      recorder.stopRecording()
    } else if (canvasRef?.current) {
      recorder.startRecording(canvasRef.current, audioRef?.current)
      if (!slideshow.isPlaying) slideshow.play()
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border">
      {/* Left: progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums min-w-[60px]">
          {slideshow.currentIndex + 1} / {slideshow.totalSlides}
        </span>
        <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${slideshow.progress}%` }}
          />
        </div>
      </div>

      {/* Center: playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={slideshow.prev}
          disabled={slideshow.currentIndex === 0}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <SkipBack size={18} />
        </button>

        <button
          onClick={slideshow.toggle}
          className="p-3 bg-primary hover:bg-primary/90 text-white rounded-full transition-colors"
        >
          {slideshow.isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={slideshow.next}
          disabled={slideshow.currentIndex >= slideshow.totalSlides - 1}
          className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Right: music + record */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => musicInputRef.current?.click()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Add background music"
        >
          <Music size={16} />
        </button>
        <input
          ref={musicInputRef}
          type="file"
          accept="audio/*"
          onChange={handleMusicUpload}
          className="hidden"
        />

        <button
          onClick={handleRecord}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
            recorder.recording
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-muted border border-input text-card-foreground hover:text-foreground'
          }`}
        >
          {recorder.recording ? (
            <>
              <Square size={12} /> Stop
            </>
          ) : (
            <>
              <Video size={12} /> Record
            </>
          )}
        </button>

        {recorder.recordedUrl && (
          <button
            onClick={recorder.downloadRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <Download size={12} /> Save
          </button>
        )}
      </div>
    </div>
  )
}
