'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function Home() {
  // References for canvas and 3D objects
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bearRef = useRef<THREE.Group | THREE.Object3D | null>(null);
  const hammerRef = useRef<THREE.Group | null>(null);
  
  // Game state
  const [health, setHealth] = useState(100);
  const [berries, setBerries] = useState(0);
  const [invincible, setInvincible] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Game variables
    const gameState = {
      keys: { w: false, a: false, s: false, d: false },
      attacking: false,
      attackCooldown: 0,
      attackAnimationId: null as number | null,
      obstacles: [] as {position: THREE.Vector3, radius: number}[],
      enemies: [] as {
        mesh: THREE.Group,
        position: THREE.Vector3,
        direction: THREE.Vector3,
        speed: number,
        health: number,
        lastDirectionChange: number,
        type: string
      }[],
      berries: [] as {
        mesh: THREE.Mesh,
        position: THREE.Vector3
      }[],
      mixer: null as THREE.AnimationMixer | null,
      animations: [] as THREE.AnimationClip[],
      walkAction: null as THREE.AnimationAction | null,
      idleAction: null as THREE.AnimationAction | null,
      isWalking: false,
      lastDamageTime: 0,
      damageInvincibilityTime: 1 // 1 second of invincibility after taking damage
    };
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Circular Ground
    const arenaRadius = 40;
    const groundGeometry = new THREE.CircleGeometry(arenaRadius, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x228B22, // Forest green
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Arena boundary
    const arenaBoundary = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.CircleGeometry(arenaRadius, 64)),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    arenaBoundary.rotation.x = -Math.PI / 2;
    arenaBoundary.position.y = 0.01;
    scene.add(arenaBoundary);
        // Utility function to check if a position is valid (not overlapping with obstacles)
        const isValidPosition = (position: THREE.Vector3, radius: number = 1): boolean => {
          // Check if within arena bounds
          const distanceFromCenter = Math.sqrt(
            position.x * position.x + position.z * position.z
          );
          
          if (distanceFromCenter > arenaRadius - radius) {
            return false;
          }
          
          // Check if overlapping with existing obstacles
          for (const obstacle of gameState.obstacles) {
            const distance = position.distanceTo(obstacle.position);
            if (distance < radius + obstacle.radius) {
              return false;
            }
          }
          
          return true;
        };
        
        // Function to get a random position within the arena
        const getRandomPosition = (minDistanceFromCenter: number = 0, maxDistanceFromCenter: number = arenaRadius): THREE.Vector3 => {
          const angle = Math.random() * Math.PI * 2;
          const distance = minDistanceFromCenter + Math.random() * (maxDistanceFromCenter - minDistanceFromCenter);
          
          return new THREE.Vector3(
            distance * Math.cos(angle),
            0,
            distance * Math.sin(angle)
          );
        };
        
        // Create a snake enemy
        const createSnake = (position: THREE.Vector3) => {
          const snake = new THREE.Group();
          
          // Snake body (cylinder)
          const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
          const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Green
          const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
          body.rotation.x = Math.PI / 2; // Rotate to be horizontal
          body.position.y = 0.2; // Slightly above ground
          body.castShadow = true;
          snake.add(body);
          
          // Snake head (cone)
          const headGeometry = new THREE.ConeGeometry(0.3, 0.5, 8);
          const headMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.rotation.x = Math.PI / 2; // Rotate to be horizontal
          head.position.set(0, 0.2, 0.9); // Position at front of body
          head.castShadow = true;
          snake.add(head);
          
          // Snake eyes
          const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
          const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red
          
          const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
          leftEye.position.set(0.1, 0.3, 1.0);
          snake.add(leftEye);
          
          const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
          rightEye.position.set(-0.1, 0.3, 1.0);
          snake.add(rightEye);
          
          // Position the snake
          snake.position.copy(position);
          
          // Add to scene
          scene.add(snake);
          
          // Add to enemies array
          gameState.enemies.push({
            mesh: snake,
            position: position,
            direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
            speed: 0.05 + Math.random() * 0.05, // Random speed between 0.05 and 0.1
            health: 1, // One hit to kill
            lastDirectionChange: Date.now(),
            type: 'snake'
          });
          
          return snake;
        };
        
        // Create a rabbit enemy
        const createRabbit = (position: THREE.Vector3) => {
          const rabbit = new THREE.Group();
          
          // Rabbit body
          const bodyGeometry = new THREE.SphereGeometry(0.25, 8, 8);
          const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF }); // White
          const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
          body.scale.set(1, 1.2, 1.5);
          body.position.y = 0.3;
          body.castShadow = true;
          rabbit.add(body);
          
          // Rabbit head
          const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF }); // White
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.position.set(0, 0.5, 0.3);
          head.castShadow = true;
          rabbit.add(head);
          
          // Rabbit ears
          const earGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
          const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF }); // White
          
          const leftEar = new THREE.Mesh(earGeometry, earMaterial);
          leftEar.position.set(-0.1, 0.8, 0.2);
          leftEar.rotation.x = -Math.PI / 6;
          leftEar.rotation.z = -Math.PI / 12;
          leftEar.castShadow = true;
          rabbit.add(leftEar);
          
          const rightEar = new THREE.Mesh(earGeometry, earMaterial);
          rightEar.position.set(0.1, 0.8, 0.2);
          rightEar.rotation.x = -Math.PI / 6;
          rightEar.rotation.z = Math.PI / 12;
          rightEar.castShadow = true;
          rabbit.add(rightEar);
                // Rabbit eyes
      const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.08, 0.55, 0.45);
      rabbit.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.08, 0.55, 0.45);
      rabbit.add(rightEye);
      
      // Position the rabbit
      rabbit.position.copy(position);
      
      // Add to scene
      scene.add(rabbit);
      
      // Add to enemies array
      gameState.enemies.push({
        mesh: rabbit,
        position: position,
        direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        speed: 0.1 + Math.random() * 0.1, // Faster than snake (0.1-0.2)
        health: 1, // One hit to kill
        lastDirectionChange: Date.now(),
        type: 'rabbit'
      });
      
      return rabbit;
    };
    
    // Create a squirrel enemy
    const createSquirrel = (position: THREE.Vector3) => {
      const squirrel = new THREE.Group();
      
      // Squirrel body
      const bodyGeometry = new THREE.SphereGeometry(0.25, 8, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.scale.set(1, 1.2, 1.3);
      body.position.y = 0.3;
      body.castShadow = true;
      squirrel.add(body);
      
      // Squirrel head
      const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.set(0, 0.5, 0.3);
      head.castShadow = true;
      squirrel.add(head);
      
      // Squirrel tail (curved cylinder)
      const tailCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0.3, -0.3),
        new THREE.Vector3(0, 0.5, -0.6),
        new THREE.Vector3(0, 0.8, -0.7),
        new THREE.Vector3(0, 0.9, -0.5)
      );
      
      const tailGeometry = new THREE.TubeGeometry(tailCurve, 8, 0.08, 8, false);
      const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray
      const tail = new THREE.Mesh(tailGeometry, tailMaterial);
      tail.castShadow = true;
      squirrel.add(tail);
      
      // Squirrel eyes
      const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.08, 0.55, 0.45);
      squirrel.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.08, 0.55, 0.45);
      squirrel.add(rightEye);
      
      // Position the squirrel
      squirrel.position.copy(position);
      
      // Add to scene
      scene.add(squirrel);
      
      // Add to enemies array
      gameState.enemies.push({
        mesh: squirrel,
        position: position,
        direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        speed: 0.08 + Math.random() * 0.07, // Medium speed (0.08-0.15)
        health: 2, // Two hits to kill
        lastDirectionChange: Date.now(),
        type: 'squirrel'
      });
      
      return squirrel;
    };
    
    // Create explosion effect
    const createExplosion = (position: THREE.Vector3) => {
      const particles = new THREE.Group();
      const numParticles = 15;
      
      for (let i = 0; i < numParticles; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xFF0000, // Red
          transparent: true,
          opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random position offset
        particle.position.set(
          position.x + (Math.random() - 0.5) * 0.5,
          position.y + Math.random() * 0.5,
          position.z + (Math.random() - 0.5) * 0.5
        );
        
        // Random velocity
        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          Math.random() * 0.1,
          (Math.random() - 0.5) * 0.1
        );
        
        particles.add(particle);
        
        // Animate particle
        const startTime = Date.now();
        const duration = 500 + Math.random() * 500; // 500-1000ms
        
        const animateParticle = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Move particle
          particle.position.add(velocity);
          
          // Fade out
          particleMaterial.opacity = 0.8 * (1 - progress);
          
          if (progress < 1) {
            requestAnimationFrame(animateParticle);
          } else {
            particles.remove(particle);
            if (particles.children.length === 0) {
              scene.remove(particles);
            }
          }
        };
        
        requestAnimationFrame(animateParticle);
      }
      
      scene.add(particles);
    };
    
    // Create hammer
    const createHammer = () => {
      const hammer = new THREE.Group();
      
      // Handle
      const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
      const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.castShadow = true;
      hammer.add(handle);
      
      // Head
      const headGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.3);
      const headMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 0.5;
      head.castShadow = true;
      hammer.add(head);
      
      // Position and rotate hammer
      hammer.rotation.x = Math.PI / 4; // Start at 45 degrees higher

      // Scale the entire hammer to be 2X as big
      hammer.scale.set(2, 2, 2);
      
      return hammer;
    };
        // Swing hammer animation
        const swingHammer = () => {
          if (!hammerRef.current) return;
          
          const startRotation = -Math.PI / 4; // Starting at 45 degrees
          const endRotation = Math.PI / 2; // End at -90 degrees
          const duration = 200; // 200ms swing
          const startTime = Date.now();
          
          const animateSwing = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Swing down
            if (progress < 0.5) {
              const swingProgress = progress * 2; // 0 to 1 during first half
              hammerRef.current!.rotation.x = startRotation + (endRotation - startRotation) * swingProgress;
            } 
            // Swing back up
            else {
              const swingProgress = (progress - 0.5) * 2; // 0 to 1 during second half
              hammerRef.current!.rotation.x = endRotation + (startRotation - endRotation) * swingProgress;
            }
            
            if (progress < 1) {
              gameState.attackAnimationId = requestAnimationFrame(animateSwing);
            } else {
              gameState.attacking = false;
              hammerRef.current!.rotation.x = startRotation; // Reset to starting position
            }
          };
          
          gameState.attackAnimationId = requestAnimationFrame(animateSwing);
        };
        
        // Create berry
        const createBerry = (position: THREE.Vector3) => {
          const berryGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const berryMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red
          const berry = new THREE.Mesh(berryGeometry, berryMaterial);
          
          // Position slightly above ground
          position.y = 0.2;
          berry.position.copy(position);
          berry.castShadow = true;
          
          // Add to scene
          scene.add(berry);
          
          // Add to berries array
          gameState.berries.push({
            mesh: berry,
            position: position
          });
          
          // Make berry bob up and down
          const startY = position.y;
          const startTime = Date.now();
          
          const animateBerry = () => {
            const time = Date.now() - startTime;
            const bobHeight = 0.05;
            const bobSpeed = 0.002;
            
            berry.position.y = startY + Math.sin(time * bobSpeed) * bobHeight;
            
            requestAnimationFrame(animateBerry);
          };
          
          requestAnimationFrame(animateBerry);
        };
        
        // Create trees
        const createTrees = () => {
          const numTrees = 20;
          
          for (let i = 0; i < numTrees; i++) {
            const treeGroup = new THREE.Group();
            
            // Randomly choose between two tree types
            const treeType = Math.random() > 0.5 ? 'pine' : 'oak';
            
            if (treeType === 'pine') {
              // Pine tree (cone-shaped)
              // Trunk
              const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 8);
              const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
              const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
              trunk.position.y = 0.5;
              trunk.castShadow = true;
              treeGroup.add(trunk);
              
              // Foliage (cone)
              const foliageGeometry = new THREE.ConeGeometry(1, 3, 8);
              const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green
              const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
              foliage.position.y = 2.5;
              foliage.castShadow = true;
              treeGroup.add(foliage);
            } else {
              // Oak tree (layered cones)
              // Trunk
              const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8);
              const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
              const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
              trunk.position.y = 0.75;
              trunk.castShadow = true;
              treeGroup.add(trunk);
              
              // Layer 1 (bottom)
              const top1Geometry = new THREE.ConeGeometry(1.375, 1.03125, 8);
              const top1Material = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green
              const top1 = new THREE.Mesh(top1Geometry, top1Material);
              top1.position.y = 1.71875;
              top1.castShadow = true;
              treeGroup.add(top1);
              
              // Layer 2 (middle)
              const top2Geometry = new THREE.ConeGeometry(1.1, 1.03125, 8);
              const top2Material = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green
              const top2 = new THREE.Mesh(top2Geometry, top2Material);
              top2.position.y = 2.75;
              top2.castShadow = true;
              treeGroup.add(top2);
              
              // Layer 3 (top)
              const top3Geometry = new THREE.ConeGeometry(0.825, 1.03125, 8);
              const top3Material = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green
              const top3 = new THREE.Mesh(top3Geometry, top3Material);
              top3.position.y = 3.78125;
              top3.castShadow = true;
              treeGroup.add(top3);
            }
            
            // Position the tree randomly within the arena
            let position;
            do {
              position = getRandomPosition(5, arenaRadius - 5);
            } while (!isValidPosition(position, 1.5));
            
            treeGroup.position.copy(position);
            
            // Add to scene
            scene.add(treeGroup);
            
            // Add to obstacles
            gameState.obstacles.push({
              position: position,
              radius: 1.5
            });
          }
        };
        
        // Create berries
        const createBerries = () => {
          const numBerries = 15;
          
          for (let i = 0; i < numBerries; i++) {
            let position;
            do {
              position = getRandomPosition(5, arenaRadius - 2);
            } while (!isValidPosition(position, 0.5));
            
            createBerry(position);
          }
        };
        
        // Create bear
        const createBear = () => {
          // Try to load bear model
          const loader = new GLTFLoader();
          loader.load(
            '/models/bearish.glb',
            (gltf) => {
              const model = gltf.scene;
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.castShadow = true;
                }
              });
              
              // Position and scale the model
              model.position.set(0, 0, 0);
              model.scale.set(2, 2, 2);
              
              // Add to scene
              scene.add(model);
              bearRef.current = model;
              
              // Set up animations if available
              if (gltf.animations && gltf.animations.length) {
                gameState.mixer = new THREE.AnimationMixer(model);
                gameState.animations = gltf.animations;
                
                // Find walk and idle animations
                const walkAnim = gameState.animations.find(a => a.name.toLowerCase().includes('walk'));
                const idleAnim = gameState.animations.find(a => a.name.toLowerCase().includes('idle'));
                
                if (walkAnim) {
                  gameState.walkAction = gameState.mixer.clipAction(walkAnim);
                }
                
                if (idleAnim) {
                  gameState.idleAction = gameState.mixer.clipAction(idleAnim);
                  gameState.idleAction.play();
                }
              }
              
              // Create and add hammer
              const hammer = createHammer();
              hammer.position.set(0.3, 0.5, 0); // Adjusted position for better look
              model.add(hammer);
              hammerRef.current = hammer;
            },
            undefined,
            (error) => {
              console.error('Error loading bear model:', error);
              // Fallback to primitive bear if model fails to load
              createPrimitiveBear();
            }
          );
        };
        
        // Create a primitive bear using basic shapes (fallback)
        const createPrimitiveBear = () => {
          const bear = new THREE.Group();
          
          // Bear body
          const bodyGeometry = new THREE.SphereGeometry(1.5, 16, 16);
          const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
          const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
          body.position.y = 1.5;
          body.castShadow = true;
          bear.add(body);
          
          // Bear head
          const headGeometry = new THREE.SphereGeometry(1, 16, 16);
          const headMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.position.y = 3;
          head.castShadow = true;
          bear.add(head);
          
          // Bear ears
          const earGeometry = new THREE.SphereGeometry(0.3, 8, 8);
          const earMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
          
          const leftEar = new THREE.Mesh(earGeometry, earMaterial);
          leftEar.position.set(-0.7, 2.7, 0);
          leftEar.castShadow = true;
          bear.add(leftEar);
          
          const rightEar = new THREE.Mesh(earGeometry, earMaterial);
          rightEar.position.set(0.7, 2.7, 0);
          rightEar.castShadow = true;
          bear.add(rightEar);
          
          // Bear snout
          const snoutGeometry = new THREE.CylinderGeometry(0.4, 0.6, 0.6, 8);
          const snoutMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
          const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
          snout.rotation.x = Math.PI / 2;
          snout.position.set(0, 2, 0.8);
          snout.castShadow = true;
          bear.add(snout);
          
          // Bear nose
          const noseGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black
          const nose = new THREE.Mesh(noseGeometry, noseMaterial);
          nose.position.set(0, 2, 1.2);
          nose.castShadow = true;
          bear.add(nose);
          
          // Bear eyes
          const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
          const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black
          
          const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
          leftEye.position.set(-0.4, 2.3, 0.8);
          leftEye.castShadow = true;
          bear.add(leftEye);
          
          const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
          rightEye.position.set(0.4, 2.3, 0.8);
          rightEye.castShadow = true;
          bear.add(rightEye);
          
          // Scale the bear to be 2X larger
          bear.scale.set(2, 2, 2);
          
          // Add bear to scene
          scene.add(bear);
          bearRef.current = bear;
          
          // Create and add hammer
          const hammer = createHammer();
          hammer.position.set(0.3, 0.5, 0); // Adjusted position for better look
          bear.add(hammer);
          hammerRef.current = hammer;
        };
        
        // Initialize the game
        const initGame = () => {
          createTrees();
          createBerries();
          createBear();
          
          // Spawn initial enemies
          const initialEnemies = 9; // 3 of each type
          
          // Spawn snakes
          for (let i = 0; i < 3; i++) {
            let position;
            do {
              position = getRandomPosition(10, arenaRadius - 5);
            } while (!isValidPosition(position, 1));
            
            createSnake(position);
          }
          
          // Spawn rabbits
          for (let i = 0; i < 3; i++) {
            let position;
            do {
              position = getRandomPosition(10, arenaRadius - 5);
            } while (!isValidPosition(position, 1));
            
            createRabbit(position);
          }
          
          // Spawn squirrels
          for (let i = 0; i < 3; i++) {
            let position;
            do {
              position = getRandomPosition(10, arenaRadius - 5);
            } while (!isValidPosition(position, 1));
            
            createSquirrel(position);
          }
          
          // Spawn new enemies periodically
          setInterval(() => {
            if (gameState.enemies.length < 15 && !gameOver) { // Max 15 enemies
              let position;
              do {
                position = getRandomPosition(10, arenaRadius - 5);
              } while (!isValidPosition(position, 1));
              
              // Random enemy type
              const enemyType = Math.floor(Math.random() * 3); // 0: snake, 1: rabbit, 2: squirrel
              
              if (enemyType === 0) {
                createSnake(position);
              } else if (enemyType === 1) {
                createRabbit(position);
              } else {
                createSquirrel(position);
              }
            }
          }, 5000); // Every 5 seconds
        };
        
        // Handle keyboard input
        const handleKeyDown = (e: KeyboardEvent) => {
          if (gameOver) return;
          
          switch (e.key.toLowerCase()) {
            case 'w':
              gameState.keys.w = true;
              break;
            case 'a':
              gameState.keys.a = true;
              break;
            case 's':
              gameState.keys.s = true;
              break;
            case 'd':
              gameState.keys.d = true;
              break;
          }
        };
        
        const handleKeyUp = (e: KeyboardEvent) => {
          switch (e.key.toLowerCase()) {
            case 'w':
              gameState.keys.w = false;
              break;
            case 'a':
              gameState.keys.a = false;
              break;
            case 's':
              gameState.keys.s = false;
              break;
            case 'd':
              gameState.keys.d = false;
              break;
          }
        };
        
        // Handle attack
        const handleClick = () => {
          if (gameOver || gameState.attackCooldown > 0 || gameState.attacking) return;
          
          gameState.attacking = true;
          gameState.attackCooldown = 0.2; // 200ms cooldown
          
          // Start the attack
          swingHammer();
          
          // Check for enemy hits
          if (bearRef.current && hammerRef.current) {
            const bearPosition = new THREE.Vector3();
            bearRef.current.getWorldPosition(bearPosition);
            
            // Get bear's forward direction
            const bearDirection = new THREE.Vector3(0, 0, 1);
            bearDirection.applyQuaternion(bearRef.current.quaternion);
            
            // Check each enemy
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
              const enemy = gameState.enemies[i];
              const distance = enemy.position.distanceTo(bearPosition);
              
              // Check if enemy is in front of bear and within range
              if (distance < 4) { // Attack range
                const enemyDirection = new THREE.Vector3().subVectors(enemy.position, bearPosition).normalize();
                const dotProduct = bearDirection.dot(enemyDirection);
                
                // If enemy is in front of bear (within ~60 degree cone)
                if (dotProduct > 0.5) {
                  // Damage enemy
                  enemy.health--;
                  
                  // Create hit effect
                  createExplosion(enemy.position);
                  
                  // If enemy is dead
                  if (enemy.health <= 0) {
                    // Remove enemy
                    scene.remove(enemy.mesh);
                    gameState.enemies.splice(i, 1);
                    
                    // Increment berry count
                    setBerries(prev => prev + 1);
                  }
                }
              }
            }
          }
        };
        
        // Handle window resize
        const handleResize = () => {
          if (!canvasRef.current) return;
          
          const width = window.innerWidth;
          const height = window.innerHeight;
          
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          
          renderer.setSize(width, height);
        };
        
        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('click', handleClick);
        window.addEventListener('resize', handleResize);
        
        // Initialize game
        initGame();
        
        // Animation loop
        const animate = () => {
          if (gameOver) return;
          
          const delta = 0.016; // Assume ~60fps
          
          // Update attack cooldown
          if (gameState.attackCooldown > 0) {
            gameState.attackCooldown -= delta;
          }
          
          // Update animation mixer
          if (gameState.mixer) {
            gameState.mixer.update(delta);
          }
          
          // Move bear based on keyboard input
          if (bearRef.current) {
            const moveSpeed = 0.15;
            let moved = false;
            let direction = new THREE.Vector3(0, 0, 0);
            
            if (gameState.keys.w) {
              direction.z -= 1;
              moved = true;
            }
            if (gameState.keys.s) {
              direction.z += 1;
              moved = true;
            }
            if (gameState.keys.a) {
              direction.x -= 1;
              moved = true;
            }
            if (gameState.keys.d) {
              direction.x += 1;
              moved = true;
            }
            
            if (moved) {
              // Normalize direction vector
              direction.normalize();
              
              // Calculate new position
              const newPosition = new THREE.Vector3(
                bearRef.current.position.x + direction.x * moveSpeed,
                bearRef.current.position.y,
                bearRef.current.position.z + direction.z * moveSpeed
              );
              
              // Check if new position is valid
              if (isValidPosition(newPosition, 1)) {
                bearRef.current.position.copy(newPosition);
              }
              
              // Rotate bear to face movement direction
              if (direction.length() > 0) {
                const targetRotation = Math.atan2(direction.x, direction.z);
                bearRef.current.rotation.y = targetRotation;
              }
            }
            
            // Update animation state
            if (gameState.isWalking !== moved) {
              gameState.isWalking = moved;
              
              if (gameState.walkAction && gameState.idleAction) {
                const fadeTime = 0.2; // Time to crossfade between animations
                
                if (moved) {
                  // Transition to walking animation
                  gameState.walkAction.reset();
                  gameState.walkAction.setEffectiveTimeScale(2.0);
                  gameState.walkAction.setEffectiveWeight(1);
                  gameState.walkAction.fadeIn(fadeTime);
                  gameState.walkAction.play();
                  
                  gameState.idleAction.fadeOut(fadeTime);
                } else {
                  // Transition to idle animation
                  gameState.idleAction.reset();
                  gameState.idleAction.setEffectiveWeight(1);
                  gameState.idleAction.fadeIn(fadeTime);
                  gameState.idleAction.play();
                  
                  gameState.walkAction.fadeOut(fadeTime);
                }
              }
            }
            
            // Update camera to follow player
            camera.position.x = bearRef.current.position.x;
            camera.position.y = 15; // Higher camera for bigger bear
            camera.position.z = bearRef.current.position.z + 20; // Further back for bigger bear
            camera.lookAt(bearRef.current.position);
          }
          
          // Update enemies
          const now = Date.now();
          for (let i = 0; i < gameState.enemies.length; i++) {
            const enemy = gameState.enemies[i];
            
            // Change direction randomly
            if (now - enemy.lastDirectionChange > 2000) { // Every 2 seconds
              // 50% chance to change direction
              if (Math.random() > 0.5) {
                enemy.direction = new THREE.Vector3(
                  Math.random() - 0.5,
                  0,
                  Math.random() - 0.5
                ).normalize();
                
                enemy.lastDirectionChange = now;
              }
            }
            
            // Move enemy
            const newPosition = new THREE.Vector3(
              enemy.position.x + enemy.direction.x * enemy.speed,
              enemy.position.y,
              enemy.position.z + enemy.direction.z * enemy.speed
            );
            
            // Check if new position is valid
            if (isValidPosition(newPosition, 0.5)) {
              enemy.position.copy(newPosition);
              enemy.mesh.position.copy(newPosition);
              
              // Rotate enemy to face movement direction
              if (enemy.direction.length() > 0) {
                const targetRotation = Math.atan2(enemy.direction.x, enemy.direction.z);
                enemy.mesh.rotation.y = targetRotation;
              }
            } else {
              // If position is invalid, reverse direction
              enemy.direction.multiplyScalar(-1);
              enemy.lastDirectionChange = now;
            }
            
            // Check for collision with player
            if (bearRef.current && !invincible) {
              const distance = enemy.position.distanceTo(bearRef.current.position);
              
              if (distance < 2) { // Collision radius
                // Take damage
                setHealth(prevHealth => {
                  const newHealth = Math.max(0, prevHealth - 10);
                  
                  // Set invincibility
                  setInvincible(true);
                  gameState.lastDamageTime = now;
                  
                  setTimeout(() => {
                    setInvincible(false);
                  }, 1000); // 1 second of invincibility
                  
                  // Check for game over
                  if (newHealth <= 0) {
                    setGameOver(true);
                  }
                  
                  return newHealth;
                });
                
                // Push player away from enemy
                if (bearRef.current) {
                  const pushDirection = new THREE.Vector3().subVectors(
                    bearRef.current.position,
                    enemy.position
                  ).normalize();
                  
                  bearRef.current.position.add(pushDirection.multiplyScalar(1));
                }
                
                // Break out of the loop after taking damage
                break;
              }
            }
          }
          
          // Check for berry collection
          if (bearRef.current) {
            for (let i = gameState.berries.length - 1; i >= 0; i--) {
              const berry = gameState.berries[i];
              const distance = berry.position.distanceTo(bearRef.current.position);
              
              if (distance < 2) { // Collection radius
                // Collect berry
                scene.remove(berry.mesh);
                gameState.berries.splice(i, 1);
                
                // Increment berry count
                setBerries(prev => prev + 1);
                
                // Spawn a new berry
                let position;
                do {
                  position = getRandomPosition(5, arenaRadius - 2);
                } while (!isValidPosition(position, 0.5));
                
                createBerry(position);
              }
            }
          }
          
          // Render scene
          renderer.render(scene, camera);
          
          // Continue animation loop if not game over
          if (!gameOver) {
            requestAnimationFrame(animate);
          }
        };
        
        // Start animation loop
        animate();
        
        // Cleanup on unmount
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          window.removeEventListener('click', handleClick);
          window.removeEventListener('resize', handleResize);
          
          if (gameState.attackAnimationId) {
            cancelAnimationFrame(gameState.attackAnimationId);
          }
          
          renderer.dispose();
        };
      }, [gameOver]);
      
      // UI
      return (
        <main className="relative">
          <canvas ref={canvasRef} className="w-full h-screen"></canvas>
          
          {/* HUD */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            {/* Health Bar */}
            <div className="bg-gray-800 w-40 h-4 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${invincible ? 'bg-yellow-400' : 'bg-red-600'}`}
                style={{ width: `${health}%` }}
              ></div>
            </div>
            
            {/* Berry Counter */}
            <div className="flex items-center gap-2 bg-red-800 px-3 py-1 rounded-full">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-white font-bold">{berries}</span>
            </div>
          </div>
          
          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
              <h1 className="text-4xl text-white font-bold mb-4">Game Over</h1>
              <p className="text-xl text-white mb-8">Score: {berries}</p>
              <button 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full"
                onClick={() => window.location.reload()}
              >
                Play Again
              </button>
            </div>
          )}
        </main>
      );
    }