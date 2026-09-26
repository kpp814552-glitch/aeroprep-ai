export default function WaterLightBackground() {
  return (
    <div className="water-light-background" aria-hidden="true">
      <div className="water-light-base" />
      <div className="water-light-parallax">
        <div className="water-orb water-orb-a" />
        <div className="water-orb water-orb-b" />
        <div className="water-orb water-orb-c" />
        <div className="water-orb water-orb-d" />
        <div className="water-caustics" />
        <div className="water-light-sheen" />
      </div>
      <div className="water-light-mist" />
      <div className="water-light-vignette" />
    </div>
  );
}
