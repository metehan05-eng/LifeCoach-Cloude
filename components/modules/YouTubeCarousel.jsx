"use client";
/**
 * YouTubeCarousel – Yatay Kaydırılabilir Video Kartları
 */
export default function YouTubeCarousel({ videos = [], searchQuery = "" }) {
  // Mock videolar – YouTube API key yoksa kullanılır
  const mockVideos = [
    {
      videoId: "QljRe",
      title: `${searchQuery || "Üretkenlik"} – Tam Rehber`,
      thumbnail: `https://picsum.photos/seed/${searchQuery}1/320/180`,
      channel: "HAN Academy",
      duration: "12:34",
      views: "245K",
    },
    {
      videoId: "mXRe2",
      title: `${searchQuery || "Başarı"} için 5 Kritik Adım`,
      thumbnail: `https://picsum.photos/seed/${searchQuery}2/320/180`,
      channel: "Life OS TR",
      duration: "8:45",
      views: "189K",
    },
    {
      videoId: "kLRe3",
      title: `Uzman İpuçları: ${searchQuery || "Hedef"}`,
      thumbnail: `https://picsum.photos/seed/${searchQuery}3/320/180`,
      channel: "Sifu Öğretiyor",
      duration: "15:20",
      views: "92K",
    },
  ];

  const displayVideos = videos.length > 0 ? videos : mockVideos;

  return (
    <div className="yt-carousel-section">
      <div className="yt-carousel-header">
        <span className="yt-carousel-icon">▶</span>
        <h4 className="yt-carousel-title">Önerilen Videolar</h4>
        {searchQuery && <span className="yt-carousel-query">"{searchQuery}"</span>}
      </div>
      <div className="yt-carousel-scroll">
        {displayVideos.map((video, i) => (
          <a
            key={video.videoId || i}
            href={`https://youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="yt-card"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {/* Thumbnail */}
            <div className="yt-card-thumb">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="yt-card-img"
                onError={(e) => {
                  e.target.src = `https://picsum.photos/seed/video${i}/320/180`;
                }}
              />
              <div className="yt-play-btn">▶</div>
              {video.duration && <span className="yt-duration">{video.duration}</span>}
            </div>

            {/* Info */}
            <div className="yt-card-info">
              <span className="yt-card-title">{video.title}</span>
              <div className="yt-card-meta">
                <span className="yt-channel">{video.channel}</span>
                {video.views && <span className="yt-views">{video.views} görüntülenme</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
