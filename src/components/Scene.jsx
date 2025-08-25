import { useState, useRef, useEffect, Suspense, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Physics, RigidBody, useRapier } from "@react-three/rapier"
import { useGLTF, OrbitControls, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"
import { useBalloons } from '../context/BalloonContext';

function Model({ setModelLoaded }) {
  const group = useRef(null)
  const { scene, animations } = useGLTF("./models/model.glb", true)
  const mixer = useRef(null)

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = child.receiveShadow = true
          if (child.material) {
            child.material.toneMapped = false
          }
        }
      })
      if (animations.length) {
        mixer.current = new THREE.AnimationMixer(scene)
        animations.forEach((clip) => mixer.current.clipAction(clip).play())
      }
      setModelLoaded(true)
    }
  }, [scene, animations, setModelLoaded])

  useFrame((state, delta) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.5 - 8
    }
    mixer.current?.update(delta)
  })

  return (
    <group ref={group} scale={2} position={[17, -5, 0]}>
      <primitive object={scene} />
    </group>
  )
}

function Balloon({ position, color, meshToBodyRef, spawning }) {
  const mesh = useRef()
  const rigidBodyRef = useRef()
  const materialRef = useRef()
  const windOffset = useRef(Math.random() * Math.PI * 2)
  const balloonMass = useRef(0.1 + Math.random() * 0.05)

  useFrame((state, delta) => {
    if (rigidBodyRef.current) {
      const buoyancyForce = { x: 0, y: 9.8 * balloonMass.current * 0.15, z: 0 }
      rigidBodyRef.current.applyImpulse(buoyancyForce, true)
      
      const time = state.clock.getElapsedTime()
      const windForce = {
        x: Math.sin(time * 0.5 + windOffset.current) * 0.08,
        y: Math.sin(time * 0.3) * 0.02,
        z: Math.cos(time * 0.4 + windOffset.current) * 0.08
      }
      rigidBodyRef.current.applyImpulse(windForce, true)
      
      const torque = {
        x: Math.sin(time * 0.7) * 0.01,
        y: Math.cos(time * 0.5) * 0.015,
        z: Math.sin(time * 0.6) * 0.01
      }
      rigidBodyRef.current.applyTorqueImpulse(torque, true)
    }

    if (spawning && materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(
        materialRef.current.opacity,
        0.8,
        0.1
      );
      
      mesh.current.scale.x = mesh.current.scale.y = mesh.current.scale.z = THREE.MathUtils.lerp(
        mesh.current.scale.x,
        1,
        0.1
      );
    }
  });

  useEffect(() => {
    if (mesh.current && spawning) {
      mesh.current.scale.set(0.1, 0.1, 0.1);
      materialRef.current.opacity = 0;
    }
  }, [spawning]);

  useEffect(() => {
    if (mesh.current && rigidBodyRef.current) {
      meshToBodyRef.current.set(mesh.current, rigidBodyRef.current)
    }
    return () => {
      if (mesh.current) {
        meshToBodyRef.current.delete(mesh.current)
      }
    }
  }, [meshToBodyRef])

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      gravityScale={0.02}
      linearDamping={1.5}
      angularDamping={1.0}
      mass={balloonMass.current}
      restitution={0.8}
      friction={0.1}
      colliders="ball"
    >
      <mesh 
        ref={mesh} 
        position={position} 
        castShadow 
        receiveShadow
      >
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial 
          ref={materialRef}
          color={color} 
          transparent={true} 
          opacity={spawning ? 0 : 0.8} 
          metalness={.3} 
          roughness={.6} 
        />
      </mesh>
    </RigidBody>
  )
}

function getRandomPosition() {
  return [
    Math.random() * 50 - 25,
    Math.random() * 50 - 25,
    Math.random() * 50 - 25,
  ]
}

function getRandomColor() {
  const colors = ["#fdaea4", "#67e8f9", "#fef08a"]
  return colors[Math.floor(Math.random() * colors.length)]
}

function RapierProvider({ rapierRef, worldRef }) {
  const { rapier, world } = useRapier()
  useEffect(() => {
    rapierRef.current = rapier
    worldRef.current = world
  }, [rapier, world])
  return null
}

function Scene3D({ setModelLoaded }) {
  const rapierRef = useRef(null)
  const worldRef = useRef(null)
  const meshToBodyRef = useRef(new Map())
  const [forceAmount] = useState(250)
  const { camera } = useThree()
  const { balloonSpawnQueue, clearSpawnQueue } = useBalloons()
  const [balloons, setBalloons] = useState([])
  const raycasterRef = useRef(new THREE.Raycaster())

  const initialBalloonData = useMemo(() => 
    Array.from({ length: 100 }).map(() => ({
      position: getRandomPosition(),
      color: getRandomColor()
    }))
  , [])

  useEffect(() => {
    if (balloonSpawnQueue.length > 0) {
      balloonSpawnQueue.forEach(({ color, count }) => {
        const newBalloons = Array.from({ length: count }).map(() => ({
          position: getRandomPosition(),
          color: color,
          id: Math.random().toString(36).substr(2, 9),
          spawning: true
        }));
        setBalloons(prev => [...prev, ...newBalloons]);
      });
      clearSpawnQueue();
    }
  }, [balloonSpawnQueue, clearSpawnQueue]);

  useEffect(() => {
    const handleResize = () => {
      const { innerWidth: width } = window;
      if (width <= 768) {
        camera.position.set(60, -15, 30);
      } else if (width <= 1024) {
        camera.position.set(55, -5, 30);
      } else {
        camera.position.set(40, -5, 30);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [camera]);

  useEffect(() => {
    const handleGlobalPointerMove = (event) => {
      const rapier = rapierRef.current
      
      if (rapier) {
        const canvas = document.querySelector('canvas')
        if (!canvas) return
        
        const rect = canvas.getBoundingClientRect()
        
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
          return
        }
        
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        
        const mouse = new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -(y / rect.height) * 2 + 1
        )
        
        raycasterRef.current.setFromCamera(mouse, camera)
        
        const meshes = Array.from(meshToBodyRef.current.keys())
        
        meshes.forEach(mesh => {
          if (!mesh.position) return
          
          const balloonWorldPos = new THREE.Vector3()
          mesh.getWorldPosition(balloonWorldPos)
          
          const sphere = new THREE.Sphere(balloonWorldPos, 3.0)
          const intersectionPoint = new THREE.Vector3()
          
          if (raycasterRef.current.ray.intersectSphere(sphere, intersectionPoint)) {
            const rigidBody = meshToBodyRef.current.get(mesh)
            
            if (rigidBody) {
              const pushDirection = new THREE.Vector3()
              pushDirection.subVectors(balloonWorldPos, intersectionPoint)
              
              if (pushDirection.length() < 0.1) {
                pushDirection.copy(raycasterRef.current.ray.direction)
                pushDirection.negate()
              }
              
              pushDirection.normalize()
              pushDirection.multiplyScalar(forceAmount)
              
              pushDirection.y += forceAmount * 0.3
              
              const impulse = new rapier.Vector3(
                pushDirection.x,
                pushDirection.y,
                pushDirection.z
              )
              
              rigidBody.applyImpulse(impulse, true)
              
              const torque = new rapier.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
              )
              rigidBody.applyTorqueImpulse(torque, true)
            }
          }
        })
      }
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove)
  }, [camera, forceAmount])

  return (
    <>
      <PerspectiveCamera makeDefault />
      <ambientLight intensity={5} />
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={1.5}
        castShadow
      />
      <directionalLight 
        position={[-10, -10, -10]} 
        intensity={0.5} 
      />
      <Physics>
        <Suspense>
          <Model setModelLoaded={setModelLoaded} />
        </Suspense>
        {initialBalloonData.map((data, index) => (
          <Balloon 
            key={index} 
            position={data.position} 
            color={data.color} 
            meshToBodyRef={meshToBodyRef}
          />
        ))}
        {balloons.map((data) => (
          <Balloon 
            key={data.id}
            position={data.position} 
            color={data.color} 
            meshToBodyRef={meshToBodyRef}
            spawning={data.spawning}
          />
        ))}
        <RapierProvider rapierRef={rapierRef} worldRef={worldRef} />
      </Physics>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI - Math.PI / 6}
      />
    </>
  )
}

export default function Scene({ setModelLoaded }) {
  return (
    <div style={{ 
      width: '100%',
      height: '100%'
    }}>
      <Canvas shadows>
        <Scene3D setModelLoaded={setModelLoaded} />
      </Canvas>
    </div>
  )
}
