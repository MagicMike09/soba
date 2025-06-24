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
      
      // Debug: Log all available animations
      console.log('🎬 Available animations:', gltf.animations.map(clip => clip.name))
      
      // Play idle animation by default
      const idleAnimation = gltf.animations.find(clip => 
        clip.name.toLowerCase() === 'idle' ||
        clip.name.toLowerCase().includes('idle') || 
        clip.name.toLowerCase().includes('rest')
      ) || gltf.animations[0]
      
      console.log('🎬 Playing default animation:', idleAnimation?.name)
      
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
  }, [gltf])

  useEffect(() => {
    if (!mixer || !animations.length) return

    // Stop all current animations
    mixer.stopAllAction()

    // Find and play animation based on state
    let targetAnimation: THREE.AnimationClip | undefined

    console.log('🎬 Looking for animation state:', animationState)

    // Helper function to find animation by multiple names
    const findAnimationByNames = (names: string[]) => {
      return animations.find(clip => {
        const clipName = clip.name.toLowerCase()
        return names.some(name => 
          clipName === name.toLowerCase() || 
          clipName.includes(name.toLowerCase())
        )
      })
    }

    switch (animationState) {
      case 'idle':
        targetAnimation = findAnimationByNames(['Idle', 'idle', 'rest', 'default'])
        break
      case 'talking':
        targetAnimation = findAnimationByNames(['Talk', 'talk', 'speak', 'speaking'])
        break
      case 'thinking':
        targetAnimation = findAnimationByNames(['Think', 'think', 'ponder', 'pondering'])
        break
      case 'hello':
        targetAnimation = findAnimationByNames(['Hello', 'hello', 'wave', 'greeting', 'hi'])
        break
      case 'bye':
        targetAnimation = findAnimationByNames(['Bye', 'bye', 'goodbye', 'farewell', 'wave'])
        break
      case 'waiting':
      case 'listening':
        // Pour listening, on utilise idle si pas d'animation spécifique
        targetAnimation = findAnimationByNames(['Listen', 'listen', 'wait', 'waiting', 'Idle', 'idle'])
        break
      case 'calling':
        targetAnimation = findAnimationByNames(['Call', 'call', 'wave', 'Hello', 'hello'])
        break
      case 'laughing':
        targetAnimation = findAnimationByNames(['Laugh', 'laugh', 'happy', 'joy'])
        break
    }

    // Fallback to idle or first animation if specific one not found
    if (!targetAnimation) {
      targetAnimation = findAnimationByNames(['Idle', 'idle']) || animations[0]
      console.log('🎬 Fallback to:', targetAnimation?.name)
    }

    console.log('🎬 Selected animation:', targetAnimation?.name, 'for state:', animationState)

    if (targetAnimation) {
      const action = mixer.clipAction(targetAnimation)
      action.reset().fadeIn(0.5).play()
    } else {
      console.warn('🎬 No animation found for state:', animationState)
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