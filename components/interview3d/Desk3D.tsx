"use client";

const DESK_COLOR = "#5c4a3a";

/** Semi-circle desk with props: laptop, glass, pen, folder */
export function Desk3D() {
  return (
    <group position={[0, -1.2, -1.2]}>
      {/* Desk top — curved front edge feel via rounded box */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.06, 1.0]} />
        <meshStandardMaterial color={DESK_COLOR} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Laptop base */}
      <group position={[-0.35, 0.05, -0.15]}>
        <mesh>
          <boxGeometry args={[0.5, 0.025, 0.35]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0.22, -0.01]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.48, 0.32, 0.015]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Screen glow */}
        <mesh position={[0, 0.22, 0.008]} rotation={[0.1, 0, 0]}>
          <planeGeometry args={[0.42, 0.26]} />
          <meshBasicMaterial color="#4a6fa5" opacity={0.15} transparent />
        </mesh>
      </group>

      {/* Water glass */}
      <group position={[0.55, 0.04, -0.2]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.04, 0.14]} />
          <meshPhysicalMaterial
            color="#c8d8e8"
            roughness={0.05}
            metalness={0}
            transparent
            opacity={0.55}
            clearcoat={0.1}
          />
        </mesh>
        {/* Water surface */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.005]} />
          <meshPhysicalMaterial color="#b0d0e8" roughness={0} metalness={0} transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Pen */}
      <mesh position={[0.45, 0.04, 0.05]} rotation={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.01, 0.16]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Resume folder */}
      <group position={[-0.55, 0.04, 0.15]} rotation={[0, -0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.22, 0.008, 0.28]} />
          <meshStandardMaterial color="#d4c4a0" roughness={0.7} metalness={0} />
        </mesh>
        <mesh position={[0, 0.005, 0]} rotation={[0.02, 0, 0]}>
          <planeGeometry args={[0.18, 0.24]} />
          <meshBasicMaterial color="#f0ead6" opacity={0.6} transparent />
        </mesh>
      </group>
    </group>
  );
}
