// src/components/AiCore3D.jsx
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";

/**
 * AiCore3D: small animated, reactive sphere. `active` prop increases rotation, distort, light intensity.
 */

export default function AiCore3D({ active = false }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.x = t * (active ? 0.9 : 0.25);
      ref.current.rotation.y = t * (active ? 1.2 : 0.35);
      ref.current.scale.x = ref.current.scale.y = ref.current.scale.z = 1 + (active ? 0.18 * Math.sin(t * 2) : 0.06 * Math.sin(t));
    }
  });

  return (
    <group>
      <Sphere args={[1.05, 64, 64]} ref={ref}>
        <meshStandardMaterial color={active ? "#06b6d4" : "#7c3aed"} metalness={0.8} roughness={0.2} emissive={active ? "#052e37" : "#120824"} emissiveIntensity={active ? 0.35 : 0.12} />
      </Sphere>
    </group>
  );
}
