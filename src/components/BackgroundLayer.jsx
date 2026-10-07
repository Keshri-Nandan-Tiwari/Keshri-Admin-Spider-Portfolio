import NebulaBackground from "./backgrounds/NebulaBackground";

// A single, fixed 3D background — starfield plus slow-rotating wireframe
// shapes tucked into the corners so they never sit behind the hero photo.
export default function BackgroundLayer() {
  return (
    <div className="scene-canvas">
      <NebulaBackground />
      <div className="bg-fade" />
    </div>
  );
}
