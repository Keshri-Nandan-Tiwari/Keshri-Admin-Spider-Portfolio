import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useTheme } from "../../ThemeContext";

const ACCENTS = {
  black: "#e0263f",
  blue: "#3b82f6",
  orange: "#ff8c1a",
  white: "#eaeaec",
};

function SpinningIcosahedron({ color, position, speed, scale }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * speed;
    ref.current.rotation.y += delta * speed * 0.7;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
    </mesh>
  );
}

function SpinningTorus({ color, position, speed, scale }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x -= delta * speed * 0.5;
    ref.current.rotation.z += delta * speed;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <torusGeometry args={[1, 0.32, 16, 100]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.45} />
    </mesh>
  );
}

export default function NebulaBackground() {
  const { theme } = useTheme();
  const color = ACCENTS[theme] || ACCENTS.black;

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 55 }}>
      <Stars radius={60} depth={40} count={1800} factor={3} fade speed={0.6} />
      <SpinningIcosahedron color={color} position={[3.2, 1.4, -2]} speed={0.25} scale={2.1} />
      <SpinningTorus color={color} position={[-3.4, -1.6, -3]} speed={0.2} scale={1.6} />
      <SpinningIcosahedron color={color} position={[-2.6, 2.4, -4]} speed={0.35} scale={0.9} />
    </Canvas>
  );
}
