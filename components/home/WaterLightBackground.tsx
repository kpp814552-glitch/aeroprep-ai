export default function WaterLightBackground() {
  return (
    <div className="water-light-background" aria-hidden="true">
      <svg className="absolute h-0 w-0" focusable="false">
        <filter id="home-water-refraction" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.009"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </svg>

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
