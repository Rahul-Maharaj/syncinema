import CinematicLoader from '@/components/CinematicLoader';

export default function RoomLoading() {
  return (
    <CinematicLoader
      title="Connecting to Private Cinema Room"
      subtitle="Securing zero-latency sync tunnel & encrypted stream..."
      fullScreen={true}
      showWallpaper={true}
    />
  );
}
