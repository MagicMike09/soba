'use client'

import React, { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { AnimationState } from '@/types'

interface Avatar3DProps {
  avatarUrl?: string
  animationState: AnimationState
  position?: { x: number; y: number; z: number }
  scale?: number
  rotation?: { x: number; y: number; z: number }
}

interface AvatarModelProps {
  url: string
  animationState: AnimationState
  position: { x: number; y: number; z: number }
  scale: number
  rotation: { x: number; y: number; z: number }
}

const AvatarModel: React.FC<AvatarModelProps> = ({
  url,
  animationState,
  position,
  scale,
  rotation
}) => {
  const meshRef = useRef<THREE.Group>(null)
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null)
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([])
  
  const gltf = useGLTF(url)

  useEffect(() => {
    if (gltf.animations && gltf.animations.length > 0) {
      const newMixer = new THREE.AnimationMixer(gltf.scene)
      setMixer(newMixer)
      setAnimations(gltf.animations)
      
      // Play idle animation by default
      const idleAnimation = gltf.animations.find(clip => 
        clip.name.toLowerCase().includes('idle') || 
        clip.name.toLowerCase().includes('rest')
      ) || gltf.animations[0]
      
      if (idleAnimation) {
        const action = newMixer.clipAction(idleAnimation)
        action.play()
      }
    }

    return () => {
      if (mixer) {
        mixer.stopAllAction()
      }
    }
  }, [gltf, mixer])

  useEffect(() => {
    if (!mixer || !animations.length) return

    // Stop all current animations
    mixer.stopAllAction()

    // Find and play animation based on state
    let targetAnimation: THREE.AnimationClip | undefined

    switch (animationState) {
      case 'idle':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('idle') || 
          clip.name.toLowerCase().includes('rest')
        )
        break
      case 'talking':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('talk') || 
          clip.name.toLowerCase().includes('speak')
        )
        break
      case 'thinking':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('think') || 
          clip.name.toLowerCase().includes('ponder')
        )
        break
      case 'waiting':
      case 'listening':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('wait') || 
          clip.name.toLowerCase().includes('idle')
        )
        break
      case 'calling':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('call') || 
          clip.name.toLowerCase().includes('wave')
        )
        break
      case 'laughing':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('laugh') || 
          clip.name.toLowerCase().includes('happy')
        )
        break
      case 'hello':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('hello') || 
          clip.name.toLowerCase().includes('wave') ||
          clip.name.toLowerCase().includes('greeting')
        )
        break
      case 'bye':
        targetAnimation = animations.find(clip => 
          clip.name.toLowerCase().includes('bye') || 
          clip.name.toLowerCase().includes('goodbye') ||
          clip.name.toLowerCase().includes('farewell')
        )
        break
    }

    // Fallback to first animation if specific one not found
    if (!targetAnimation) {
      targetAnimation = animations[0]
    }

    if (targetAnimation) {
      const action = mixer.clipAction(targetAnimation)
      action.reset().fadeIn(0.5).play()
    }
  }, [animationState, mixer, animations])

  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }

    // Add subtle breathing animation
    if (meshRef.current && animationState === 'idle') {
      meshRef.current.scale.y = scale + Math.sin(state.clock.elapsedTime * 2) * 0.01
    }
  })

  return (
    <group
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      scale={[scale, scale, scale]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      <primitive object={gltf.scene} />
    </group>
  )
}

const DefaultAvatar: React.FC<{
  animationState: AnimationState
  position: { x: number; y: number; z: number }
  scale: number
}> = ({ animationState, position, scale }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return

    switch (animationState) {
      case 'talking':
        meshRef.current.scale.y = scale + Math.sin(state.clock.elapsedTime * 8) * 0.1
        break
      case 'thinking':
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.2
        break
      case 'idle':
      default:
        meshRef.current.scale.y = scale + Math.sin(state.clock.elapsedTime * 2) * 0.02
        break
    }
  })

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#4A90E2" />
    </mesh>
  )
}

const Avatar3D: React.FC<Avatar3DProps> = ({
  avatarUrl,
  animationState,
  position = { x: 0, y: 0, z: 0 },
  scale = 1,
  rotation = { x: 0, y: 0, z: 0 }
}) => {
  return (
    <div className="w-full h-full">
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enableZoom={false} enablePan={false} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Suspense fallback={
          <DefaultAvatar 
            animationState={animationState} 
            position={position} 
            scale={scale} 
          />
        }>
          {avatarUrl ? (
            <AvatarModel
              url={avatarUrl}
              animationState={animationState}
              position={position}
              scale={scale}
              rotation={rotation}
            />
          ) : (
            <DefaultAvatar 
              animationState={animationState} 
              position={position} 
              scale={scale} 
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}

export default Avatar3D