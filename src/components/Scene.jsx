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

  useFrame((state, delta) => {
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
      mesh.current.raycast = (raycaster, intersects) => {
        const sphere = new THREE.Sphere(mesh.current.position, 2)
        const rayDirection = new THREE.Vector3()
        rayDirection.copy(raycaster.ray.direction)
        
        const intersectionPoint = new THREE.Vector3()
        const result = raycaster.ray.intersectSphere(sphere, intersectionPoint)
        
        if (result) {
          intersects.push({
            distance: raycaster.ray.origin.distanceTo(intersectionPoint),
            point: intersectionPoint,
            object: mesh.current
          })
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
    <RigidBody ref={rigidBodyRef} gravityScale={0} colliders="ball">
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
  const [forceAmount] = useState(270)
  const { camera } = useThree()
  const { balloonSpawnQueue, clearSpawnQueue } = useBalloons()
  const [balloons, setBalloons] = useState([])

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
      const { clientX, clientY } = event
      const rapier = rapierRef.current
      
      if (rapier) {
        const canvas = camera.userData?.canvas || document.querySelector('canvas')
        if (!canvas) return
        
        const rect = canvas.getBoundingClientRect()
        
        const x = clientX - rect.left
        const y = clientY - rect.top
        
        const mouse = new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -(y / rect.height) * 2 + 1
        )
        
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mouse, camera)
        
        const meshes = Array.from(meshToBodyRef.current.keys())
        const intersects = raycaster.intersectObjects(meshes, false)
        
        intersects.forEach(intersect => {
          const mesh = intersect.object
          const rigidBody = meshToBodyRef.current.get(mesh)
          
          if (rigidBody) {
            const threeVector = new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(forceAmount)
            
            const randomDirection = new rapier.Vector3(
              threeVector.x,
              threeVector.y,
              threeVector.z
            )
            
            rigidBody.applyImpulse(randomDirection, true)
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
