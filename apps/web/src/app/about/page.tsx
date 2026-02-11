'use client';

import { useState, useRef } from 'react';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';

// Cloudinary base URL
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dvohtcqvi';

// Asset configuration
const ASSETS = {
  // Static image pages (SVG or PNG)
  images: {
    1: `${CLOUDINARY_BASE}/image/upload/src/about-page/1.png`,
    2: `${CLOUDINARY_BASE}/raw/upload/src/about-page/2.svg`,
    5: `${CLOUDINARY_BASE}/image/upload/src/about-page/5.png`,
    7: `${CLOUDINARY_BASE}/raw/upload/src/about-page/7.svg`,
  },
  // Video pages with thumbnails
  videos: {
    3: {
      thumbnail: `${CLOUDINARY_BASE}/raw/upload/src/about-page/3.svg`,
      video: 'https://videos.files.wordpress.com/cfiz6ZIj/ageless-literature-about-us-5.mp4',
    },
    4: {
      thumbnail: `${CLOUDINARY_BASE}/image/upload/src/about-page/4.png`,
      video: 'https://videos.files.wordpress.com/kXmbNHXW/ageless-literature-about-us-1-2.mp4',
    },
    6: {
      thumbnail: `${CLOUDINARY_BASE}/raw/upload/src/about-page/6.svg`,
      video: 'https://videos.files.wordpress.com/0pdIUURj/ageless-literature-about-us-4.mp4',
    },
    8: {
      thumbnail: `${CLOUDINARY_BASE}/raw/upload/src/about-page/8.svg`,
      video: 'https://videos.files.wordpress.com/NhLv45UK/ageless-literature-about-us-3.mp4',
    },
    9: {
      thumbnail: `${CLOUDINARY_BASE}/raw/upload/src/about-page/9.svg`,
      video: 'https://videos.files.wordpress.com/neQyxkK9/ageless-literature-about-us-2-2.mp4',
    },
  },
};

// Page order: 1, 2, 3(video), 4(video), 5, 6(video), 7, 8(video), 9(video)
const PAGE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const INITIAL_PAGES = 4;

interface VideoPlayerProps {
  thumbnail: string;
  videoUrl: string;
  pageNum: number;
}

function VideoPlayer({ thumbnail, videoUrl, pageNum }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = async () => {
    if (!videoRef.current) return;

    if (!isPlaying) {
      setIsLoading(true);
      setShowThumbnail(false);

      // Load and play video
      videoRef.current.load();
      try {
        videoRef.current.currentTime = 1;
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.log('Play prevented:', err);
      }
      setIsLoading(false);
    } else if (videoRef.current.paused) {
      await videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 1;
      videoRef.current.play();
    }
  };

  return (
    <div className="relative w-full">
      {/* Thumbnail */}
      {showThumbnail && (
        <img
          src={thumbnail}
          alt={`Page ${pageNum}`}
          className="w-full h-auto cursor-pointer"
          onClick={handlePlayClick}
        />
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className={`w-full h-auto cursor-pointer ${showThumbnail ? 'hidden' : 'block'}`}
        playsInline
        loop
        onClick={handleVideoClick}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause Button */}
      {(showThumbnail || !isPlaying || (isPlaying && videoRef.current?.paused)) && !isLoading && (
        <button
          onClick={handlePlayClick}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                     w-16 h-16 bg-primary/70 hover:bg-primary/90 rounded-full 
                     flex items-center justify-center transition-all duration-300
                     text-white text-xl z-10"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying && !videoRef.current?.paused ? <Pause size={24} /> : <Play size={24} />}
        </button>
      )}
    </div>
  );
}

interface ImagePageProps {
  src: string;
  pageNum: number;
}

function ImagePage({ src, pageNum }: ImagePageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full min-h-[200px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={`Page ${pageNum}`}
        className={`w-full h-auto transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        loading={pageNum <= 2 ? 'eager' : 'lazy'}
      />
    </div>
  );
}

function PageContent({ pageNum }: { pageNum: number }) {
  const videoConfig = ASSETS.videos[pageNum as keyof typeof ASSETS.videos];
  const imageUrl = ASSETS.images[pageNum as keyof typeof ASSETS.images];

  if (videoConfig) {
    return (
      <VideoPlayer
        thumbnail={videoConfig.thumbnail}
        videoUrl={videoConfig.video}
        pageNum={pageNum}
      />
    );
  }

  if (imageUrl) {
    return <ImagePage src={imageUrl} pageNum={pageNum} />;
  }

  return null;
}

export default function AboutPage() {
  const [showAll, setShowAll] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const remainingContentRef = useRef<HTMLDivElement>(null);

  const remainingPages = PAGE_ORDER.slice(INITIAL_PAGES);

  const handleLearnMore = () => {
    if (!showAll) {
      setIsLoadingMore(true);
      // Small delay for better UX
      setTimeout(() => {
        setShowAll(true);
        setIsLoadingMore(false);
        // Scroll to new content
        setTimeout(() => {
          remainingContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }, 300);
    } else {
      setShowAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="text-center py-8 sm:py-12 px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          About Ageless Literature
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
          Your premier destination for rare and collectible books
        </p>
      </div>

      {/* Content Container */}
      <div className="w-full">
        {/* Initial Pages */}
        <div className="space-y-0">
          {PAGE_ORDER.slice(0, INITIAL_PAGES).map((pageNum) => (
            <PageContent key={pageNum} pageNum={pageNum} />
          ))}
        </div>

        {/* Learn More Section */}
        <div className="text-center py-12 border-t border-b border-gray-200 my-8">
          {isLoadingMore ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
              <p className="text-gray-600">Loading additional content...</p>
            </div>
          ) : (
            <button
              onClick={handleLearnMore}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 
                         text-white font-semibold rounded-lg transition-all duration-300
                         text-lg shadow-md hover:shadow-lg"
            >
              {showAll ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              {showAll ? 'Show Less' : 'Learn More - View Additional Content'}
            </button>
          )}
        </div>

        {/* Remaining Pages (hidden until "Learn More" clicked) */}
        {showAll && (
          <div ref={remainingContentRef} className="space-y-0">
            {remainingPages.map((pageNum) => (
              <PageContent key={pageNum} pageNum={pageNum} />
            ))}
          </div>
        )}
      </div>

      {/* Footer spacing */}
      <div className="h-16" />
    </div>
  );
}
