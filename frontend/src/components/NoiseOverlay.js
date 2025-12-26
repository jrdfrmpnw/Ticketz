export const NoiseOverlay = () => {
  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1580122252289-8eccefa9ce2e?crop=entropy&cs=srgb&fm=jpg&q=85)',
        backgroundSize: 'cover',
        backgroundRepeat: 'repeat'
      }}
    />
  );
};

export default NoiseOverlay;