import CinematicLoader from '@/components/CinematicLoader';

export default function Loading() {
  return (
    <CinematicLoader
      title="SyncCinema"
      subtitle="Preparing your synchronized virtual cinema experience..."
      fullScreen={true}
      showWallpaper={true}
    />
  );
}
