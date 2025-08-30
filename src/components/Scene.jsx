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
    <group ref={group} scale={[2, 2, 2]} position={[17, -5, 0]}>
      <primitive object={scene} />
    </group>
  )
}

function Skybox({ setSkyboxLoaded }) {
  const skyboxGroupRef = useRef()
  const { scene } = useGLTF("./models/skybox.glb", true)

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false
          child.receiveShadow = false
          if (child.material) {
            child.material.toneMapped = false
            child.material.depthWrite = false
          }
        }
      })
      setSkyboxLoaded(true)
    }
  }, [scene, setSkyboxLoaded])

  useFrame((state) => {
    if (skyboxGroupRef.current) {
      skyboxGroupRef.current.rotation.y = state.clock.getElapsedTime() * 0.001
    }
  })

  return (
    <group ref={skyboxGroupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}

function Balloon({ position, color, meshToBodyRef, spawning, onRemove, id }) {
  const mesh = useRef()
  const balloonMeshRef = useRef()
  const balloonGroupRef = useRef()
  const rigidBodyRef = useRef()
  const materialRef = useRef()
  const knotMaterialRef = useRef()
  const windOffset = useRef(Math.random() * Math.PI * 2)
  const balloonMass = useRef(0.1 + Math.random() * 0.05)
  const spawnPosition = useRef(new THREE.Vector3(...position))
  
  const wobbleRef = useRef({ x: 0, y: 0, z: 0, intensity: 0 })
  const lastImpactRef = useRef({ point: new THREE.Vector3(), time: 0 })
  const deformationRef = useRef({ x: 1, y: 1, z: 1 })
  
  const originalRotationRef = useRef({ x: 0, y: 0, z: 0 })

  useFrame((state, delta) => {
    const currentTime = state.clock.getElapsedTime()
    
    if (rigidBodyRef.current) {
      const buoyancyForce = { x: 0, y: 9.8 * balloonMass.current * 0.1, z: 0 }
      rigidBodyRef.current.applyImpulse(buoyancyForce, true)
      
      const windForce = {
        x: Math.sin(currentTime * 0.5 + windOffset.current) * 0.08,
        y: Math.sin(currentTime * 0.3) * 0.02,
        z: Math.cos(currentTime * 0.4 + windOffset.current) * 0.08
      }
      rigidBodyRef.current.applyImpulse(windForce, true)
      
      const torque = {
        x: Math.sin(currentTime * 0.7) * 0.01,
        y: Math.cos(currentTime * 0.5) * 0.015,
        z: Math.sin(currentTime * 0.6) * 0.01
      }
      rigidBodyRef.current.applyTorqueImpulse(torque, true)
    }

    if (balloonMeshRef.current && balloonGroupRef.current) {
      const timeSinceImpact = currentTime - lastImpactRef.current.time
      
      if (timeSinceImpact < 2.0) {
        const wobbleDecay = Math.max(0, 1 - timeSinceImpact / 2.0)
        const wobbleFreq = 12 * (1 + wobbleRef.current.intensity)
        
        const wobbleX = Math.sin(currentTime * wobbleFreq) * wobbleRef.current.x * wobbleDecay * 0.5
        const wobbleY = Math.sin(currentTime * wobbleFreq * 1.2) * wobbleRef.current.y * wobbleDecay * 0.3
        const wobbleZ = Math.sin(currentTime * wobbleFreq * 0.8) * wobbleRef.current.z * wobbleDecay * 0.5
        
        const deformX = 1 + wobbleX * 0.8
        const deformY = 1 + wobbleY * 0.6  
        const deformZ = 1 + wobbleZ * 0.8
        
        balloonMeshRef.current.scale.set(deformX, deformY, deformZ)
        
        const rotationX = wobbleX * 1
        const rotationZ = wobbleZ * 1
        
        const complementaryRotX = Math.sin(currentTime * wobbleFreq * 0.7) * wobbleRef.current.z * wobbleDecay * 0.2
        const complementaryRotY = Math.sin(currentTime * wobbleFreq * 0.5) * wobbleRef.current.intensity * wobbleDecay * 0.15
        const complementaryRotZ = Math.sin(currentTime * wobbleFreq * 0.9) * wobbleRef.current.x * wobbleDecay * 0.2
        
        balloonGroupRef.current.rotation.x = originalRotationRef.current.x + rotationX + complementaryRotX
        balloonGroupRef.current.rotation.y = originalRotationRef.current.y + complementaryRotY
        balloonGroupRef.current.rotation.z = originalRotationRef.current.z + rotationZ + complementaryRotZ
      } else {
        balloonMeshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 5)
        balloonGroupRef.current.rotation.x = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.x, originalRotationRef.current.x, delta * 5)
        balloonGroupRef.current.rotation.y = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.y, originalRotationRef.current.y, delta * 5)
        balloonGroupRef.current.rotation.z = THREE.MathUtils.lerp(balloonGroupRef.current.rotation.z, originalRotationRef.current.z, delta * 5)
      }
    }

    if (spawning && materialRef.current && knotMaterialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(
        materialRef.current.opacity,
        0.85,
        0.1
      );
      
      knotMaterialRef.current.opacity = THREE.MathUtils.lerp(
        knotMaterialRef.current.opacity,
        0.9,
        0.1
      );
      
      mesh.current.scale.x = mesh.current.scale.y = mesh.current.scale.z = THREE.MathUtils.lerp(
        mesh.current.scale.x,
        1,
        0.1
      );
    }

    if (mesh.current && onRemove) {
      const currentPosition = new THREE.Vector3()
      mesh.current.getWorldPosition(currentPosition)
      const distanceFromSpawn = currentPosition.distanceTo(spawnPosition.current)
      
      if (distanceFromSpawn > 100) {
        onRemove(id)
      }
    }
  });

  const triggerWobble = (impactPoint, impactDirection, intensity = 1, currentTime) => {
    if (!balloonMeshRef.current) return
    
    const balloonPos = new THREE.Vector3()
    balloonMeshRef.current.getWorldPosition(balloonPos)
    
    const relativeImpact = impactPoint.clone().sub(balloonPos).normalize()
    
    wobbleRef.current.x = relativeImpact.x * intensity
    wobbleRef.current.y = relativeImpact.y * intensity * 0.5
    wobbleRef.current.z = relativeImpact.z * intensity
    wobbleRef.current.intensity = intensity
    
    lastImpactRef.current.point.copy(impactPoint)
    lastImpactRef.current.time = currentTime || performance.now() / 1000
  }

  useEffect(() => {
    if (mesh.current && spawning) {
      mesh.current.scale.set(0.1, 0.1, 0.1);
      if (materialRef.current) {
        materialRef.current.opacity = 0;
      }
      if (knotMaterialRef.current) {
        knotMaterialRef.current.opacity = 0;
      }
    }
    
    if (balloonMeshRef.current && originalRotationRef.current.x === 0 && originalRotationRef.current.y === 0 && originalRotationRef.current.z === 0) {
      originalRotationRef.current.x = balloonMeshRef.current.rotation.x
      originalRotationRef.current.y = balloonMeshRef.current.rotation.y
      originalRotationRef.current.z = balloonMeshRef.current.rotation.z
    }
  }, [spawning]);

  useEffect(() => {
    if (mesh.current && rigidBodyRef.current) {
      meshToBodyRef.current.set(mesh.current, rigidBodyRef.current)
      mesh.current.triggerWobble = triggerWobble
      
      if (balloonGroupRef.current) {
        originalRotationRef.current = {
          x: balloonGroupRef.current.rotation.x,
          y: balloonGroupRef.current.rotation.y,
          z: balloonGroupRef.current.rotation.z
        }
      }
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
        <group ref={balloonGroupRef}>
          <mesh ref={balloonMeshRef}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshPhysicalMaterial 
              ref={materialRef}
              color={color} 
              transparent={true} 
              opacity={spawning ? 0 : 0.85}
              roughness={0.1}
              metalness={0.0}
              clearcoat={0.8}
              clearcoatRoughness={0.1}
              transmission={0.1}
              thickness={0.5}
            />
          </mesh>
          {/* Balloon knot - with proper material reference */}
          <mesh position={[0, -2.1, 0]} scale={[0.3, 0.4, 0.3]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshPhysicalMaterial 
              ref={knotMaterialRef}
              color={color}
              transparent={true}
              opacity={spawning ? 0 : 0.9}
              roughness={0.8}
              metalness={0.0}
            />
          </mesh>
        </group>
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
  const clockTimeRef = useRef(0)
  
  const [modelLoadedState, setModelLoadedState] = useState(false)
  const [skyboxLoadedState, setSkyboxLoadedState] = useState(false)

  useEffect(() => {
    const allLoaded = modelLoadedState && skyboxLoadedState
    setModelLoaded(allLoaded)
  }, [modelLoadedState, skyboxLoadedState, setModelLoaded])

  useFrame((state) => {
    clockTimeRef.current = state.clock.getElapsedTime()
  })

  const [initialBalloons, setInitialBalloons] = useState(() => 
    Array.from({ length: 60 }).map((_, index) => ({
      position: getRandomPosition(),
      color: getRandomColor(),
      id: `initial-${index}`
    }))
  )

  const removeBalloon = (balloonId) => {
    if (balloonId.startsWith('initial-')) {
      setInitialBalloons(prev => prev.filter(balloon => balloon.id !== balloonId))
    } else {
      setBalloons(prev => prev.filter(balloon => balloon.id !== balloonId))
    }
  }

  useEffect(() => {
    if (balloonSpawnQueue.length > 0) {
      balloonSpawnQueue.forEach(({ color, count }) => {
        const currentTotalBalloons = initialBalloons.length + balloons.length;
        const maxNewBalloons = Math.max(0, 400 - currentTotalBalloons);
        const actualCount = Math.min(count, maxNewBalloons);
        
        if (actualCount > 0) {
          const newBalloons = Array.from({ length: actualCount }).map(() => ({
            position: getRandomPosition(),
            color: color,
            id: Math.random().toString(36).substr(2, 9),
            spawning: true
          }));
          setBalloons(prev => [...prev, ...newBalloons]);
        }
      });
      clearSpawnQueue();
    }
  }, [balloonSpawnQueue, clearSpawnQueue, initialBalloons.length, balloons.length]);

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
              
              const distanceFromCenter = intersectionPoint.distanceTo(balloonWorldPos)
              const forceIntensity = Math.max(0.3, 1 - distanceFromCenter / 3.0)
              
              pushDirection.normalize()
              const adjustedForceAmount = forceAmount * forceIntensity
              pushDirection.multiplyScalar(adjustedForceAmount)
              
              pushDirection.y += adjustedForceAmount * 0.3
              
              const impulse = new rapier.Vector3(
                pushDirection.x,
                pushDirection.y,
                pushDirection.z
              )
              
              rigidBody.applyImpulse(impulse, true)
              
              const torqueDirection = new THREE.Vector3()
              torqueDirection.crossVectors(
                intersectionPoint.clone().sub(balloonWorldPos),
                pushDirection.clone().normalize()
              )
              
              const torque = new rapier.Vector3(
                torqueDirection.x * forceIntensity * 2,
                torqueDirection.y * forceIntensity * 2,
                torqueDirection.z * forceIntensity * 2
              )
              rigidBody.applyTorqueImpulse(torque, true)
              
              if (mesh.triggerWobble) {
                mesh.triggerWobble(intersectionPoint, pushDirection, forceIntensity, clockTimeRef.current)
              }
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
          <Skybox setSkyboxLoaded={setSkyboxLoadedState} />
          <Model setModelLoaded={setModelLoadedState} />
        </Suspense>
        {(modelLoadedState && skyboxLoadedState) && (
          <>
            {initialBalloons.map((data) => (
              <Balloon 
                key={data.id}
                id={data.id}
                position={data.position} 
                color={data.color} 
                meshToBodyRef={meshToBodyRef}
                onRemove={removeBalloon}
              />
            ))}
            {balloons.map((data) => (
              <Balloon 
                key={data.id}
                id={data.id}
                position={data.position} 
                color={data.color} 
                meshToBodyRef={meshToBodyRef}
                spawning={data.spawning}
                onRemove={removeBalloon}
              />
            ))}
          </>
        )}
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
      height: '100%',
    }}>
      <Canvas 
        shadows
        gl={{ 
          clearColor: '#111111',
          alpha: false 
        }}
      >
        <Scene3D setModelLoaded={setModelLoaded} />
      </Canvas>
    </div>
  )
}
