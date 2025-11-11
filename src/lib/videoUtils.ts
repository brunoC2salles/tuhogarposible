export const convertToEmbedUrl = (url: string): string | null => {
  // YouTube - formato youtu.be/VIDEO_ID
  const youtubeShortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (youtubeShortMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeShortMatch[1]}`;
  }
  
  // YouTube - formato youtube.com/watch?v=VIDEO_ID
  const youtubeWatchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (youtubeWatchMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
  }
  
  // YouTube - formato youtube.com/embed/VIDEO_ID (já está correto)
  const youtubeEmbedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (youtubeEmbedMatch?.[1]) {
    return url; // Já está no formato correto
  }
  
  // Vimeo - formato vimeo.com/VIDEO_ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Vimeo - formato player.vimeo.com/video/VIDEO_ID (já está correto)
  const vimeoPlayerMatch = url.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (vimeoPlayerMatch?.[1]) {
    return url; // Já está no formato correto
  }
  
  return null; // URL não reconhecida
};
