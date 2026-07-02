/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sun, 
  Moon, 
  Maximize2, 
  Minimize2, 
  Car, 
  Sliders, 
  Clock, 
  Activity, 
  Settings, 
  Footprints, 
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Eye,
  TrafficCone
} from 'lucide-react';
import { Vehicle, Pedestrian } from './simulation';
import { VehicleType, SignalState, SimulationConfig, VehicleStats, PedestrianStats } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Simulation parameters held in React state for dashboard UI
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [spawnRate, setSpawnRate] = useState<number>(3); // 1 to 5 slider
  const [signalState, setSignalState] = useState<SignalState>(SignalState.GREEN);
  const [signalTimer, setSignalTimer] = useState<number>(10); // initial Green timer
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Live Stats
  const [stats, setStats] = useState<VehicleStats>({
    onRoad: 0,
    passed: 0,
    total: 0,
    byType: {
      [VehicleType.SPORTS_CAR]: { current: 0, total: 0 },
      [VehicleType.LUXURY_SEDAN]: { current: 0, total: 0 },
      [VehicleType.SUV]: { current: 0, total: 0 },
      [VehicleType.PICKUP_TRUCK]: { current: 0, total: 0 },
      [VehicleType.DELIVERY_VAN]: { current: 0, total: 0 },
      [VehicleType.TRUCK]: { current: 0, total: 0 },
      [VehicleType.MOTORCYCLE]: { current: 0, total: 0 },
    }
  });

  const [pedStats, setPedStats] = useState<PedestrianStats>({
    crossingCount: 0,
    totalCrossed: 0,
  });

  const [simulationTime, setSimulationTime] = useState<number>(0);
  const [roadDensity, setRoadDensity] = useState<'Fluid' | 'Moderate' | 'Heavy' | 'Gridlock'>('Fluid');

  // Keep references to values for the animation/simulation loop to avoid closure capture
  const vehiclesRef = useRef<Vehicle[]>([]);
  const pedestriansRef = useRef<Pedestrian[]>([]);
  const signalRef = useRef<SignalState>(SignalState.GREEN);
  const speedRef = useRef<number>(1);
  const pausedRef = useRef<boolean>(false);
  const spawnRateRef = useRef<number>(3);
  const lastSpawnTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(10);
  const autoModeRef = useRef<boolean>(true);
  const tickRef = useRef<number>(0);
  const signalIntensitiesRef = useRef({ RED: 0.0, YELLOW: 0.0, GREEN: 1.0 });

  // Initialize canvas size state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 380 });

  // Update refs when states change
  useEffect(() => { signalRef.current = signalState; }, [signalState]);
  useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { spawnRateRef.current = spawnRate; }, [spawnRate]);
  useEffect(() => { autoModeRef.current = !isManualOverride; }, [isManualOverride]);

  // Synchronize clock and auto signal phase
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (isPaused) return;

      // Increment simulation timer
      setSimulationTime(prev => prev + 1);

      // Decrement signal timer in automatic mode
      if (!isManualOverride) {
        setSignalTimer(prev => {
          const nextVal = prev - 1;
          timerRef.current = nextVal;
          if (nextVal <= 0) {
            // State transition
            let nextState = SignalState.GREEN;
            let nextDuration = 10;

            if (signalRef.current === SignalState.GREEN) {
              nextState = SignalState.YELLOW;
              nextDuration = 3;
            } else if (signalRef.current === SignalState.YELLOW) {
              nextState = SignalState.RED;
              nextDuration = 10;
            } else if (signalRef.current === SignalState.RED) {
              nextState = SignalState.GREEN;
              nextDuration = 10;
            }

            setSignalState(nextState);
            timerRef.current = nextDuration;
            return nextDuration;
          }
          return nextVal;
        });
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isPaused, isManualOverride]);

  // Handle Red-light trigger for pedestrian spawning
  useEffect(() => {
    if (signalState === SignalState.RED && !isPaused) {
      // Spawn a wave of 3-6 pedestrians crossing the crosswalk
      const pCount = Math.floor(3 + Math.random() * 4);
      const canvasWidth = canvasDimensions.width;
      const zebraX = canvasWidth / 2;
      const topSidewalkY = 110;
      const bottomSidewalkY = 270;

      const newPedestrians: Pedestrian[] = [];
      for (let i = 0; i < pCount; i++) {
        const id = `ped-${Date.now()}-${i}`;
        const side = Math.random() > 0.5 ? 'top' : 'bottom';
        // Random slight offsets within crosswalk stripes
        const xOffset = (Math.random() - 0.5) * 45;
        const x = zebraX + xOffset;

        if (side === 'top') {
          // Top to bottom
          const p = new Pedestrian(id, x, topSidewalkY - 15 - (Math.random() * 15), bottomSidewalkY + 15, 'down');
          newPedestrians.push(p);
        } else {
          // Bottom to top
          const p = new Pedestrian(id, x, bottomSidewalkY + 15 + (Math.random() * 15), topSidewalkY - 15, 'up');
          newPedestrians.push(p);
        }
      }

      pedestriansRef.current = [...pedestriansRef.current, ...newPedestrians];
      setPedStats(prev => ({
        ...prev,
        crossingCount: pedestriansRef.current.filter(p => !p.isFinished).length
      }));
    }
  }, [signalState, isPaused, canvasDimensions.width]);

  // Handle automatic canvas resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain fixed height 380px for best visual proportions
      const height = 380;
      setCanvasDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Set initial spawn rates and spawn vehicles loop
  useEffect(() => {
    let spawnTimer: NodeJS.Timeout;

    const handleSpawning = () => {
      if (pausedRef.current) {
        spawnTimer = setTimeout(handleSpawning, 1000);
        return;
      }

      // Spawn rate controls the delay between possible spawns
      // Rate 1: ~5s, Rate 2: ~4s, Rate 3: ~3s, Rate 4: ~2s, Rate 5: ~1.2s
      const delay = (6 - spawnRateRef.current) * 1000 * (0.7 + Math.random() * 0.6);

      spawnVehicle();

      spawnTimer = setTimeout(handleSpawning, delay);
    };

    spawnTimer = setTimeout(handleSpawning, 1500);

    return () => clearTimeout(spawnTimer);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
        case 'r':
          resetSimulation();
          break;
        case '1':
          setSpeedMultiplier(1);
          break;
        case '2':
          setSpeedMultiplier(2);
          break;
        case '4':
          setSpeedMultiplier(4);
          break;
        case 'd':
          setIsDarkMode(prev => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'g':
          manualChangeSignal(SignalState.GREEN);
          break;
        case 'y':
          manualChangeSignal(SignalState.YELLOW);
          break;
        case 'o': // 'o' for orange/red
        case 's': // 's' for stop/red
          manualChangeSignal(SignalState.RED);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasDimensions]);

  // Method to manually change the traffic signal state (bypassing auto cycle)
  const manualChangeSignal = (state: SignalState) => {
    setIsManualOverride(true);
    setSignalState(state);
    if (state === SignalState.GREEN) setSignalTimer(10);
    else if (state === SignalState.YELLOW) setSignalTimer(3);
    else if (state === SignalState.RED) setSignalTimer(10);
  };

  // Restore automatic signal cycle
  const resumeAutomaticCycle = () => {
    setIsManualOverride(false);
    // Align countdown timer to appropriate remaining values
    if (signalState === SignalState.GREEN) setSignalTimer(10);
    else if (signalState === SignalState.YELLOW) setSignalTimer(3);
    else if (signalState === SignalState.RED) setSignalTimer(10);
  };

  // Logic to spawn a single vehicle safely
  const spawnVehicle = (forcedType?: VehicleType) => {
    const isTopLane = Math.random() > 0.5;
    const lane: 'top' | 'bottom' = isTopLane ? 'top' : 'bottom';
    
    // Choose vehicle type
    const types = [
      VehicleType.SPORTS_CAR,
      VehicleType.LUXURY_SEDAN,
      VehicleType.SUV,
      VehicleType.PICKUP_TRUCK,
      VehicleType.DELIVERY_VAN,
      VehicleType.TRUCK,
      VehicleType.MOTORCYCLE
    ];
    // Slightly weight passenger cars higher for natural feel
    const typeWeights = [0.12, 0.22, 0.22, 0.12, 0.12, 0.1, 0.1];
    let selectedType = forcedType;

    if (!selectedType) {
      let r = Math.random();
      let sum = 0;
      for (let i = 0; i < types.length; i++) {
        sum += typeWeights[i];
        if (r <= sum) {
          selectedType = types[i];
          break;
        }
      }
    }
    if (!selectedType) selectedType = VehicleType.LUXURY_SEDAN;

    const canvasWidth = canvasDimensions.width;
    const spawnX = lane === 'top' ? -100 : canvasWidth + 100;
    const laneY = lane === 'top' ? 150 : 230; // lanes coordinates inside road (top is L->R, bottom is R->L)

    // Check if the spawning zone is clear of existing vehicles in the same lane
    const sameLaneVehicles = vehiclesRef.current.filter(v => v.lane === lane);
    let isZoneClear = true;

    if (sameLaneVehicles.length > 0) {
      // Find vehicle nearest to the spawn point
      const closestVehicle = lane === 'top'
        ? sameLaneVehicles.reduce((min, v) => v.x < min.x ? v : min, sameLaneVehicles[0])
        : sameLaneVehicles.reduce((max, v) => v.x > max.x ? v : max, sameLaneVehicles[0]);

      const distanceToEdge = lane === 'top' 
        ? closestVehicle.x - closestVehicle.width/2 
        : canvasWidth - (closestVehicle.x + closestVehicle.width/2);

      if (distanceToEdge < 100) {
        isZoneClear = false;
      }
    }

    if (!isZoneClear && !forcedType) {
      // Delay spawn if blocked, unless forced by manual button click
      return;
    }

    const id = `vehicle-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newVehicle = new Vehicle(id, selectedType, spawnX, laneY, lane);
    
    vehiclesRef.current.push(newVehicle);
    updateStatsOnSpawn(selectedType);
  };

  const updateStatsOnSpawn = (type: VehicleType) => {
    setStats(prev => {
      const updatedType = { ...prev.byType[type] };
      updatedType.current += 1;
      updatedType.total += 1;

      return {
        ...prev,
        total: prev.total + 1,
        onRoad: prev.onRoad + 1,
        byType: {
          ...prev.byType,
          [type]: updatedType
        }
      };
    });
  };

  const resetSimulation = () => {
    vehiclesRef.current = [];
    pedestriansRef.current = [];
    setSignalState(SignalState.GREEN);
    setSignalTimer(10);
    setIsManualOverride(false);
    setSimulationTime(0);
    setStats({
      onRoad: 0,
      passed: 0,
      total: 0,
      byType: {
        [VehicleType.SPORTS_CAR]: { current: 0, total: 0 },
        [VehicleType.LUXURY_SEDAN]: { current: 0, total: 0 },
        [VehicleType.SUV]: { current: 0, total: 0 },
        [VehicleType.PICKUP_TRUCK]: { current: 0, total: 0 },
        [VehicleType.DELIVERY_VAN]: { current: 0, total: 0 },
        [VehicleType.TRUCK]: { current: 0, total: 0 },
        [VehicleType.MOTORCYCLE]: { current: 0, total: 0 },
      }
    });
    setPedStats({
      crossingCount: 0,
      totalCrossed: 0
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error enabling fullscreen", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      tickRef.current += 1;
      const width = canvasDimensions.width;
      const height = canvasDimensions.height;
      const currentSpeed = pausedRef.current ? 0 : speedRef.current;

      // Smoothly interpolate traffic light fading intensities
      const targetRed = signalRef.current === SignalState.RED ? 1.0 : 0.0;
      const targetYellow = signalRef.current === SignalState.YELLOW ? 1.0 : 0.0;
      const targetGreen = signalRef.current === SignalState.GREEN ? 1.0 : 0.0;

      // Use a standard animDt of 1.0 if simulation is paused, so transitions still finish smoothly in the editor/canvas.
      const animDt = currentSpeed || 1.0;
      const lerpSpeed = 0.08 * animDt;

      const lerp = (curr: number, targ: number, rate: number) => {
        const val = curr + (targ - curr) * rate;
        return Math.abs(val - targ) < 0.015 ? targ : val;
      };

      signalIntensitiesRef.current.RED = lerp(signalIntensitiesRef.current.RED, targetRed, lerpSpeed);
      signalIntensitiesRef.current.YELLOW = lerp(signalIntensitiesRef.current.YELLOW, targetYellow, lerpSpeed);
      signalIntensitiesRef.current.GREEN = lerp(signalIntensitiesRef.current.GREEN, targetGreen, lerpSpeed);

      // 1. CLEAR CANVAS
      ctx.clearRect(0, 0, width, height);

      // 2. DRAW GRASS/BACKGROUND
      ctx.fillStyle = isDarkMode ? '#111C15' : '#EAF5EC';
      ctx.fillRect(0, 0, width, height);

      // 3. DRAW ENVIRONMENT DECORATIONS
      drawTrees(ctx, width, isDarkMode);
      drawRoadSigns(ctx, width, isDarkMode);

      // 4. DRAW URBAN STREET LIGHT BEAMS (If Dark Mode)
      if (isDarkMode) {
        drawStreetLightBeams(ctx, width);
      }

      // 5. DRAW ROAD STRUCTURE
      const roadY = 110;
      const roadHeight = 160;
      const roadCenterY = roadY + roadHeight / 2;

      // Road Asphalt
      ctx.fillStyle = isDarkMode ? '#1E293B' : '#334155';
      ctx.fillRect(0, roadY, width, roadHeight);

      // Sidewalks
      const sidewalkHeight = 25;
      const topSidewalkY = roadY - sidewalkHeight;
      const bottomSidewalkY = roadY + roadHeight;

      // Sidewalk backgrounds
      ctx.fillStyle = isDarkMode ? '#334155' : '#E2E8F0';
      ctx.fillRect(0, topSidewalkY, width, sidewalkHeight);
      ctx.fillRect(0, bottomSidewalkY, width, sidewalkHeight);

      // Curb Lines
      ctx.strokeStyle = isDarkMode ? '#475569' : '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(width, roadY);
      ctx.moveTo(0, roadY + roadHeight);
      ctx.lineTo(width, roadY + roadHeight);
      ctx.stroke();

      // Sidewalk brick markings (fine vertical lines)
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, topSidewalkY);
        ctx.lineTo(x, roadY);
        ctx.moveTo(x, bottomSidewalkY);
        ctx.lineTo(x, bottomSidewalkY + sidewalkHeight);
      }
      ctx.stroke();

      // White solid edge lines
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, roadY + 8);
      ctx.lineTo(width, roadY + 8);
      ctx.moveTo(0, roadY + roadHeight - 8);
      ctx.lineTo(width, roadY + roadHeight - 8);
      ctx.stroke();

      // Lane Divider (Dashed double-line yellow)
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([15, 12]);
      ctx.beginPath();
      ctx.moveTo(0, roadCenterY - 2.5);
      ctx.lineTo(width, roadCenterY - 2.5);
      ctx.moveTo(0, roadCenterY + 2.5);
      ctx.lineTo(width, roadCenterY + 2.5);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Zebra Crossing (Crosswalk)
      const zebraX = width / 2;
      const zebraW = 60;
      const zebraY = roadY + 12;
      const zebraH = roadHeight - 24;

      // Outer zebra lines boundaries
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(zebraX - zebraW/2, zebraY);
      ctx.lineTo(zebraX - zebraW/2, zebraY + zebraH);
      ctx.moveTo(zebraX + zebraW/2, zebraY);
      ctx.lineTo(zebraX + zebraW/2, zebraY + zebraH);
      ctx.stroke();

      // Zebra stripes
      ctx.fillStyle = '#FFFFFF';
      const stripeW = 12;
      const stripeGap = 12;
      for (let y = zebraY + 2; y < zebraY + zebraH - 2; y += stripeW + stripeGap) {
        ctx.fillRect(zebraX - zebraW/2, y, zebraW, stripeW);
      }

      // Stop Lines (Solid White line 35px before zebra crossing)
      const stopLineX_top = zebraX - zebraW/2 - 35; // top lane L->R
      const stopLineX_bottom = zebraX + zebraW/2 + 35; // bottom lane R->L

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Top lane stop line (stops Left->Right vehicles)
      ctx.moveTo(stopLineX_top, roadY + 10);
      ctx.lineTo(stopLineX_top, roadCenterY - 8);
      // Bottom lane stop line (stops Right->Left vehicles)
      ctx.moveTo(stopLineX_bottom, roadCenterY + 8);
      ctx.lineTo(stopLineX_bottom, roadY + roadHeight - 10);
      ctx.stroke();

      // 6. UPDATE AND DRAW PEDESTRIANS
      const activePedestrians = pedestriansRef.current;
      for (let i = activePedestrians.length - 1; i >= 0; i--) {
        const ped = activePedestrians[i];
        if (!pausedRef.current) {
          ped.update(currentSpeed);
        }
        ped.draw(ctx, isDarkMode);

        // Remove pedestrian if finished
        if (ped.isFinished) {
          activePedestrians.splice(i, 1);
          setPedStats(prev => ({
            crossingCount: activePedestrians.filter(p => !p.isFinished).length,
            totalCrossed: prev.totalCrossed + 1
          }));
        }
      }

      // 7. UPDATE AND DRAW VEHICLES
      const activeVehicles = vehiclesRef.current;
      
      // Sort vehicles in each lane by x to apply logical queuing
      const topLaneVehicles = activeVehicles
        .filter(v => v.lane === 'top')
        .sort((a, b) => a.x - b.x); // Sorted left-to-right (leading vehicle is further right)

      const bottomLaneVehicles = activeVehicles
        .filter(v => v.lane === 'bottom')
        .sort((a, b) => b.x - a.x); // Sorted right-to-left (leading vehicle is further left)

      // Update Top Lane
      for (let i = 0; i < topLaneVehicles.length; i++) {
        const vehicle = topLaneVehicles[i];
        const leadingVehicle = i === topLaneVehicles.length - 1 ? null : topLaneVehicles[i + 1];
        
        const passedBeforeUpdate = vehicle.hasPassed;
        
        if (!pausedRef.current) {
          vehicle.update(currentSpeed, leadingVehicle, signalRef.current, stopLineX_top, zebraX);
        }
        
        vehicle.draw(ctx, isDarkMode);

        // Account for newly passed vehicles
        if (!passedBeforeUpdate && vehicle.hasPassed) {
          incrementPassedCount(vehicle.type);
        }
      }

      // Update Bottom Lane
      for (let i = 0; i < bottomLaneVehicles.length; i++) {
        const vehicle = bottomLaneVehicles[i];
        const leadingVehicle = i === bottomLaneVehicles.length - 1 ? null : bottomLaneVehicles[i + 1];
        
        const passedBeforeUpdate = vehicle.hasPassed;

        if (!pausedRef.current) {
          vehicle.update(currentSpeed, leadingVehicle, signalRef.current, stopLineX_bottom, zebraX);
        }
        
        vehicle.draw(ctx, isDarkMode);

        // Account for newly passed vehicles
        if (!passedBeforeUpdate && vehicle.hasPassed) {
          incrementPassedCount(vehicle.type);
        }
      }

      // Handle off-screen vehicles
      for (let i = activeVehicles.length - 1; i >= 0; i--) {
        const v = activeVehicles[i];
        const isOffScreen = v.lane === 'top'
          ? v.x - v.width/2 > width + 100
          : v.x + v.width/2 < -100;

        if (isOffScreen) {
          // Remove vehicle and update active onRoad stats
          activeVehicles.splice(i, 1);
          setStats(prev => {
            const updatedType = { ...prev.byType[v.type] };
            updatedType.current = Math.max(0, updatedType.current - 1);
            return {
              ...prev,
              onRoad: Math.max(0, prev.onRoad - 1),
              byType: {
                ...prev.byType,
                [v.type]: updatedType
              }
            };
          });
        }
      }

      // Calculate dynamic density rating
      const onRoadCount = activeVehicles.length;
      let density: 'Fluid' | 'Moderate' | 'Heavy' | 'Gridlock' = 'Fluid';
      if (onRoadCount > 10) density = 'Gridlock';
      else if (onRoadCount > 7) density = 'Heavy';
      else if (onRoadCount > 3) density = 'Moderate';
      setRoadDensity(density);

      // 8. DRAW PHYSICAL TRAFFIC LIGHTS
      drawPhysicalTrafficSignal(ctx, stopLineX_top - 15, roadY - 15, signalRef.current, 'top', isDarkMode);
      drawPhysicalTrafficSignal(ctx, stopLineX_bottom + 15, roadY + roadHeight + 15, signalRef.current, 'bottom', isDarkMode);

      // 9. DRAW STREET LIGHT PHYSICAL POSTS
      drawPhysicalStreetlights(ctx, width, topSidewalkY, bottomSidewalkY + sidewalkHeight, isDarkMode);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [canvasDimensions, isDarkMode]);

  // Method to increment passed stats
  const incrementPassedCount = (type: VehicleType) => {
    setStats(prev => {
      return {
        ...prev,
        passed: prev.passed + 1,
      };
    });
  };

  // HELPER CANVAS RENDERING FUNCTIONS (To keep main update clean and modular)

  const drawTrees = (ctx: CanvasRenderingContext2D, width: number, isDark: boolean) => {
    const locations = [
      { x: 50, y: 35 },
      { x: 180, y: 40 },
      { x: width - 220, y: 35 },
      { x: width - 70, y: 45 },
      { x: 120, y: 345 },
      { x: 290, y: 350 },
      { x: width - 150, y: 345 }
    ];

    locations.forEach(tree => {
      ctx.save();
      
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.beginPath();
      ctx.ellipse(tree.x + 3, tree.y + 4, 18, 10, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Trunk
      ctx.fillStyle = isDark ? '#451A03' : '#78350F';
      ctx.fillRect(tree.x - 3.5, tree.y - 12, 7, 24);

      // Canopy layers (overlapping circles for detailed visual feel)
      const canopyColors = isDark 
        ? ['#064E3B', '#065F46', '#047857'] 
        : ['#15803D', '#166534', '#14532D'];

      ctx.fillStyle = canopyColors[0];
      ctx.beginPath();
      ctx.arc(tree.x - 8, tree.y - 12, 11, 0, 2 * Math.PI);
      ctx.arc(tree.x + 8, tree.y - 12, 11, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = canopyColors[1];
      ctx.beginPath();
      ctx.arc(tree.x, tree.y - 20, 13, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    });
  };

  const drawRoadSigns = (ctx: CanvasRenderingContext2D, width: number, isDark: boolean) => {
    // 1. Crosswalk sign (Top sidewalk before the crossing)
    const zebraX = width / 2;
    const signX = zebraX - 110;
    const signY = 60;

    ctx.save();
    // Pole
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(signX, signY);
    ctx.lineTo(signX, 90);
    ctx.stroke();

    // Diamond board
    ctx.translate(signX, signY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#EAB308'; // Amber yellow
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeRect(-8, -8, 16, 16);

    // Inner icon symbol representation
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-4, -1, 8, 2); // stripes
    ctx.fillRect(-1.5, -4, 3, 5); // walking man torso
    ctx.restore();

    // 2. Speed Limit Sign (Bottom side)
    const limitX = zebraX + 110;
    const limitY = 320;

    ctx.save();
    // Pole
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(limitX, limitY + 12);
    ctx.lineTo(limitX, 290);
    ctx.stroke();

    // Rectangular Board
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#EF4444'; // Red circle border
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(limitX, limitY, 9, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Text "50"
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', limitX, limitY);
    ctx.restore();
  };

  const drawStreetLightBeams = (ctx: CanvasRenderingContext2D, width: number) => {
    const spacing = 220;
    const count = Math.ceil(width / spacing) + 1;

    for (let i = 0; i < count; i++) {
      const x = i * spacing + 40;
      
      // Top row lights projecting down
      const topBeamGrad = ctx.createRadialGradient(x, 70, 10, x, 140, 80);
      topBeamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
      topBeamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
      topBeamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      
      ctx.fillStyle = topBeamGrad;
      ctx.beginPath();
      ctx.arc(x, 80, 80, 0, Math.PI);
      ctx.fill();

      // Bottom row lights projecting up
      const bottomBeamGrad = ctx.createRadialGradient(x, 310, 10, x, 240, 80);
      bottomBeamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
      bottomBeamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
      bottomBeamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = bottomBeamGrad;
      ctx.beginPath();
      ctx.arc(x, 300, 80, Math.PI, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawPhysicalStreetlights = (ctx: CanvasRenderingContext2D, width: number, topBorderY: number, bottomBorderY: number, isDark: boolean) => {
    const spacing = 220;
    const count = Math.ceil(width / spacing) + 1;

    for (let i = 0; i < count; i++) {
      const x = i * spacing + 40;

      // Top street lights
      ctx.save();
      // Base
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 3, 50, 6, 30);
      // Arm
      ctx.fillRect(x - 3, 50, 15, 3.5);
      // Head
      ctx.fillStyle = isDark ? '#FEF08A' : '#94A3B8';
      ctx.fillRect(x + 8, 48, 8, 5);
      ctx.restore();

      // Bottom street lights
      ctx.save();
      // Base
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 3, 300, 6, 30);
      // Arm
      ctx.fillRect(x - 3, 326.5, 15, 3.5);
      // Head
      ctx.fillStyle = isDark ? '#FEF08A' : '#94A3B8';
      ctx.fillRect(x + 8, 326.5, 8, 5);
      ctx.restore();
    }
  };

  const drawPhysicalTrafficSignal = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: SignalState,
    position: 'top' | 'bottom',
    isDark: boolean
  ) => {
    ctx.save();

    // Redefine sizes: 25-40% larger than old (old: boxW=16, boxH=36, radius=3.5)
    const boxW = 24;
    const boxH = 58;
    const boxX = x - boxW / 2;
    const boxY = position === 'top' ? y - boxH - 18 : y + 18;

    const lampRadius = 5.5;
    const lampSpacing = 16;
    const firstLampY = boxY + 13;

    // Pole configuration
    const poleX = position === 'top' ? x - 22 : x + 22;
    const poleBaseY = position === 'top' ? y + 10 : y - 10;
    const armY = position === 'top' ? boxY + 12 : boxY + boxH - 12;
    const poleTopY = position === 'top' ? armY - 8 : armY + 8;

    // A. BACKGROUND SHADOW (For the whole structure to make it pop)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = position === 'top' ? 3 : -3;

    // B. POLE BASE
    const baseGrad = ctx.createLinearGradient(poleX - 7, 0, poleX + 7, 0);
    baseGrad.addColorStop(0, '#1E293B');
    baseGrad.addColorStop(0.4, '#475569');
    baseGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(poleX - 6, poleBaseY - (position === 'top' ? 3 : -3), 12, (position === 'top' ? 5 : -5), 2);
    ctx.fill();

    // C. VERTICAL MAST POLE
    const poleGrad = ctx.createLinearGradient(poleX - 3.5, 0, poleX + 3.5, 0);
    poleGrad.addColorStop(0, '#334155');
    poleGrad.addColorStop(0.3, '#94A3B8');
    poleGrad.addColorStop(0.7, '#475569');
    poleGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = poleGrad;
    ctx.fillRect(poleX - 3, Math.min(poleBaseY, poleTopY), 6, Math.abs(poleBaseY - poleTopY));

    // D. REACTION HAZARD STRIPES (Near bottom of pole for ultimate realism)
    const stripeStartY = position === 'top' ? poleBaseY - 20 : poleBaseY + 5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(poleX - 3, Math.min(stripeStartY, stripeStartY + (position === 'top' ? -15 : 15)), 6, 15);
    ctx.clip();
    
    // Draw alternate yellow and black diagonal stripes
    ctx.fillStyle = '#EAB308'; // Amber/Yellow
    ctx.fillRect(poleX - 3, Math.min(stripeStartY, stripeStartY + (position === 'top' ? -15 : 15)), 6, 15);
    ctx.strokeStyle = '#0F172A'; // Dark charcoal
    ctx.lineWidth = 3;
    for (let sy = Math.min(stripeStartY, stripeStartY + (position === 'top' ? -15 : 15)) - 5; sy < Math.max(stripeStartY, stripeStartY + (position === 'top' ? -15 : 15)) + 15; sy += 5) {
      ctx.beginPath();
      ctx.moveTo(poleX - 5, sy);
      ctx.lineTo(poleX + 5, sy + 5);
      ctx.stroke();
    }
    ctx.restore();

    // E. HORIZONTAL OUTREACH MOUNTING ARM & BRACKETS
    const armGrad = ctx.createLinearGradient(0, armY - 2, 0, armY + 2);
    armGrad.addColorStop(0, '#475569');
    armGrad.addColorStop(0.5, '#64748B');
    armGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = armGrad;
    ctx.fillRect(Math.min(poleX, x), armY - 2.5, Math.abs(poleX - x), 5);

    // Double mount brackets attaching the box to the arm/pole
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x - 3, armY - 3.5, 6, 7);

    // F. SIGNAL HEAD BOX CASING (Rounded, polished 3D look)
    // Reset shadow for the box itself so we can draw crisp shadows manually
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Main casing gradient
    const casingGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
    casingGrad.addColorStop(0, '#1E293B');  // Slate gray side
    casingGrad.addColorStop(0.25, '#334155'); // Metallic specular highlights
    casingGrad.addColorStop(0.75, '#1E293B'); // Midtone slate
    casingGrad.addColorStop(1, '#0F172A');  // Deep shadow side
    ctx.fillStyle = casingGrad;
    
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();

    // Sleek chrome outer border ring
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.stroke();

    // Subtle 3D vertical shine reflection line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + 4, boxY + 3);
    ctx.lineTo(boxX + 4, boxY + boxH - 3);
    ctx.stroke();

    // G. DRAW VISORS & LAMPS
    // Fade values from our interpolating ref
    const intensityRED = signalIntensitiesRef.current.RED;
    const intensityYELLOW = signalIntensitiesRef.current.YELLOW;
    const intensityGREEN = signalIntensitiesRef.current.GREEN;

    const lamps = [
      {
        y: firstLampY,
        intensity: intensityRED,
        activeRGB: { r: 255, g: 45, b: 45 },      // Bright Red
        dimRGB: { r: 59, g: 10, b: 10 },          // Dim Red
        glowColor: '#FF2D2D',
        glowShadow: 'rgba(255, 45, 45, 0.5)'
      },
      {
        y: firstLampY + lampSpacing,
        intensity: intensityYELLOW,
        activeRGB: { r: 255, g: 215, b: 0 },      // Bright Yellow
        dimRGB: { r: 58, g: 42, b: 0 },           // Dim Yellow
        glowColor: '#FFD700',
        glowShadow: 'rgba(255, 215, 0, 0.5)'
      },
      {
        y: firstLampY + lampSpacing * 2,
        intensity: intensityGREEN,
        activeRGB: { r: 0, g: 230, b: 118 },      // Bright Green
        dimRGB: { r: 0, g: 45, b: 23 },           // Dim Green
        glowColor: '#00E676',
        glowShadow: 'rgba(0, 230, 118, 0.5)'
      }
    ];

    lamps.forEach((lamp) => {
      const lampY = lamp.y;
      const intensity = lamp.intensity;

      // 1. Visor / Hood (Dark plastic curved canopy above the bulb)
      ctx.strokeStyle = '#0B0F19';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Arc over the top half of the lamp, from Math.PI to 2*Math.PI
      ctx.arc(x, lampY, lampRadius + 3, Math.PI - 0.15, 2 * Math.PI + 0.15);
      ctx.stroke();

      // 2. Draw black backing for unlit bulb
      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.arc(x, lampY, lampRadius, 0, 2 * Math.PI);
      ctx.fill();

      // 3. Interpolated lit bulb fill
      const r = Math.round(lamp.dimRGB.r + (lamp.activeRGB.r - lamp.dimRGB.r) * intensity);
      const g = Math.round(lamp.dimRGB.g + (lamp.activeRGB.g - lamp.dimRGB.g) * intensity);
      const b = Math.round(lamp.dimRGB.b + (lamp.activeRGB.b - lamp.dimRGB.b) * intensity);
      const lampFill = `rgb(${r}, ${g}, ${b})`;

      ctx.fillStyle = lampFill;
      ctx.beginPath();
      ctx.arc(x, lampY, lampRadius, 0, 2 * Math.PI);
      ctx.fill();

      // 4. Bloom / Glow effect if illuminated
      if (intensity > 0.05) {
        ctx.save();
        // Atmospheric glow gradient
        const glowGrad = ctx.createRadialGradient(x, lampY, lampRadius - 1, x, lampY, lampRadius * 3.5);
        glowGrad.addColorStop(0, `rgba(${lamp.activeRGB.r}, ${lamp.activeRGB.g}, ${lamp.activeRGB.b}, ${0.4 * intensity})`);
        glowGrad.addColorStop(0.3, `rgba(${lamp.activeRGB.r}, ${lamp.activeRGB.g}, ${lamp.activeRGB.b}, ${0.15 * intensity})`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, lampY, lampRadius * 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }

      // 5. Glassy reflection 3D specular highlight (always visible, gets brighter when lit)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.22 + 0.55 * intensity})`;
      ctx.beginPath();
      ctx.arc(x - 2, lampY - 2, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // H. DIGITAL COUNTDOWN TIMER HUD
    const timerY = position === 'top' ? boxY - 18 : boxY + boxH + 18;
    const timerRadius = 12;

    // Bezel Gradient (Shiny silver outer rim)
    const bezelGrad = ctx.createLinearGradient(x - timerRadius, timerY - timerRadius, x + timerRadius, timerY + timerRadius);
    bezelGrad.addColorStop(0, '#64748B');
    bezelGrad.addColorStop(0.5, '#94A3B8');
    bezelGrad.addColorStop(1, '#334155');
    ctx.strokeStyle = bezelGrad;
    ctx.lineWidth = 2.5;

    // Dark matrix glass center
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(x, timerY, timerRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Subtle Grid/Lines overlay to simulate digital matrix
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let lx = x - timerRadius + 2; lx < x + timerRadius - 2; lx += 3) {
      ctx.moveTo(lx, timerY - timerRadius);
      ctx.lineTo(lx, timerY + timerRadius);
    }
    ctx.stroke();

    // Determine timer LED glow colors based on current state
    let timerGlowColor = '#00E676';
    let timerShadowColor = 'rgba(0, 230, 118, 0.5)';
    if (state === SignalState.RED) {
      timerGlowColor = '#FF2D2D';
      timerShadowColor = 'rgba(255, 45, 45, 0.5)';
    } else if (state === SignalState.YELLOW) {
      timerGlowColor = '#FFD700';
      timerShadowColor = 'rgba(255, 215, 0, 0.5)';
    }

    // Active digital countdown numbers
    ctx.save();
    ctx.shadowColor = timerShadowColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = timerGlowColor;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timerRef.current.toString().padStart(2, '0'), x, timerY + 0.5);
    ctx.restore();

    ctx.restore();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* HEADER SECTION */}
      <header className={`px-6 py-4 border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} sticky top-0 z-40 backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                MetroGrid Smart Traffic
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Live Urban Intersection Signal Flow & Simulation
              </p>
            </div>
          </div>

          {/* SIMULATION TIMER HUD */}
          <div className={`flex items-center gap-6 px-4 py-1.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-100 border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Sim Time</div>
            </div>
            <div className="text-lg font-mono font-extrabold text-emerald-500">
              {Math.floor(simulationTime / 60).toString().padStart(2, '0')}:
              {(simulationTime % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {/* SYSTEM GLOBAL CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
                isPaused 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
              id="pause-btn"
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={resetSimulation}
              className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              id="reset-btn"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <div className={`flex rounded-xl p-1 border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              {[1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setSpeedMultiplier(speed)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    speedMultiplier === speed
                      ? (isDarkMode ? 'bg-slate-800 text-emerald-400 shadow-md' : 'bg-white text-emerald-600 shadow-sm')
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 text-amber-400 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SIMULATION DISPLAY & SPAWNER */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          
          {/* SIMULATION VISUAL BOX */}
          <div 
            ref={containerRef}
            className={`relative rounded-3xl overflow-hidden border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-emerald-950/10' 
                : 'bg-white border-slate-200 shadow-xl'
            }`}
          >
            {/* Simulation Overlays */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                roadDensity === 'Fluid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                roadDensity === 'Moderate' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                roadDensity === 'Heavy' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                <Activity className="w-3 h-3 animate-pulse" />
                Density: {roadDensity}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isPaused ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {isPaused ? 'Paused' : 'Active'}
              </span>
            </div>

            {/* Simulated Street Signs Display */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <div className={`p-1.5 rounded-full backdrop-blur-md ${isDarkMode ? 'bg-black/40 text-slate-400' : 'bg-slate-100/80 text-slate-600'}`} title="Crosswalk Alert active">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            {/* HTML5 CANVAS CONTAINER */}
            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              className="block w-full cursor-crosshair"
              style={{ height: `${canvasDimensions.height}px` }}
            />
          </div>

          {/* INTERACTIVE INJECTION PANEL */}
          <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold tracking-tight">Manual Injection & Spawning</h2>
            </div>
            
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium leading-relaxed">
              Inject specific vehicles directly into the flow or trigger pedestrian crossing waves manually to observe collision boundaries and stop line queue behavior.
            </p>

            {/* Vehicle injectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => spawnVehicle(VehicleType.SPORTS_CAR)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>Sports Car</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => spawnVehicle(VehicleType.LUXURY_SEDAN)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>Luxury Sedan</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => spawnVehicle(VehicleType.SUV)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>SUV</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => spawnVehicle(VehicleType.PICKUP_TRUCK)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>Pickup Truck</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => spawnVehicle(VehicleType.DELIVERY_VAN)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>Delivery Van</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => spawnVehicle(VehicleType.TRUCK)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>Heavy Truck</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => spawnVehicle(VehicleType.MOTORCYCLE)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${
                  isDarkMode ? 'bg-slate-950 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <span>Motorcycle</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  if (signalState !== SignalState.RED) {
                    manualChangeSignal(SignalState.RED);
                  } else {
                    // Trigger wave again directly
                    setSignalState(SignalState.GREEN);
                    setTimeout(() => setSignalState(SignalState.RED), 50);
                  }
                }}
                className="py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between bg-red-500 hover:bg-red-600 text-white shadow-sm"
              >
                <span>Pedestrians</span>
                <Footprints className="w-4 h-4 text-red-100" />
              </button>
            </div>

            {/* Slider Config */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-6 pt-5 border-t border-slate-800/80">
              <div className="w-full sm:w-1/2">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400">Automatic Spawn Intensity</span>
                  <span className="text-emerald-400">{spawnRate} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={spawnRate}
                  onChange={(e) => setSpawnRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="w-full sm:w-1/2 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400">
                  <Info className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Vehicles check dynamic safety margins of <span className="text-emerald-400 font-bold">safe gap = 35px + (speed × 8)</span> to adjust braking behavior smoothly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: SYSTEM CONTROL OVERRIDES & STATISTICS */}
        <section className="flex flex-col gap-6">

          {/* TRAFFIC LIGHT CONTROLS CARD */}
          <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 shadow-lg' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold tracking-tight">Signal Controller Override</h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                isManualOverride ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {isManualOverride ? 'Manual Override' : 'Auto Phase'}
              </span>
            </div>

            {/* Current Signal status card */}
            <div className={`p-4 rounded-2xl mb-4 border flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Current Signal</div>
                <div className={`text-lg font-extrabold flex items-center gap-2 ${
                  signalState === SignalState.GREEN ? 'text-emerald-500' :
                  signalState === SignalState.YELLOW ? 'text-amber-500' :
                  'text-red-500'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    signalState === SignalState.GREEN ? 'bg-emerald-500' :
                    signalState === SignalState.YELLOW ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />
                  {signalState}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Countdown Timer</div>
                <div className="text-2xl font-mono font-black text-emerald-500">{signalTimer}s</div>
              </div>
            </div>

            {/* Manual Light triggers */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => manualChangeSignal(SignalState.GREEN)}
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center gap-1.5 ${
                  signalState === SignalState.GREEN 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500' 
                    : 'bg-slate-800/10 border-slate-800 text-slate-400 hover:bg-slate-800/35'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981]" />
                Go Green
              </button>
              <button
                onClick={() => manualChangeSignal(SignalState.YELLOW)}
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center gap-1.5 ${
                  signalState === SignalState.YELLOW 
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500' 
                    : 'bg-slate-800/10 border-slate-800 text-slate-400 hover:bg-slate-800/35'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_#F59E0B]" />
                Go Yellow
              </button>
              <button
                onClick={() => manualChangeSignal(SignalState.RED)}
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all border flex flex-col items-center gap-1.5 ${
                  signalState === SignalState.RED 
                    ? 'bg-red-500/15 text-red-400 border-red-500' 
                    : 'bg-slate-800/10 border-slate-800 text-slate-400 hover:bg-slate-800/35'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_#EF4444]" />
                Stop Red
              </button>
            </div>

            {isManualOverride && (
              <button
                onClick={resumeAutomaticCycle}
                className="w-full mt-3 py-2 px-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current text-emerald-400" />
                Resume Automatic Cycle Phase
              </button>
            )}
          </div>

          {/* LIVE GRAPH STATISTICS PANEL */}
          <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold tracking-tight">Intersection Metrics</h2>
            </div>

            {/* Quick aggregate counters */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className={`p-3 rounded-2xl text-center border ${isDarkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'}`}>
                <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">On-Road</div>
                <div className="text-lg font-black text-slate-100 dark:text-slate-100">{stats.onRoad}</div>
              </div>
              <div className={`p-3 rounded-2xl text-center border ${isDarkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'}`}>
                <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Passed</div>
                <div className="text-lg font-black text-slate-100 dark:text-slate-100">{stats.passed}</div>
              </div>
              <div className={`p-3 rounded-2xl text-center border ${isDarkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'}`}>
                <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Total</div>
                <div className="text-lg font-black text-slate-100 dark:text-slate-100">{stats.total}</div>
              </div>
            </div>

            {/* Pedestrian Crossing Counters */}
            <div className={`p-3.5 rounded-2xl mb-4 border flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                  <Footprints className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 dark:text-slate-200">Pedestrian Crossings</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Currently crossing crosswalk</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-red-400">{pedStats.crossingCount}</div>
                <div className="text-[9px] font-bold text-slate-400">{pedStats.totalCrossed} Crossed</div>
              </div>
            </div>

            {/* Vehicle Type Detail Tables */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Vehicle Type Breakdown</h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {Object.keys(stats.byType).map((key) => {
                  const typeName = key as VehicleType;
                  const typeData = stats.byType[typeName];
                  const percentage = stats.total > 0 ? Math.round((typeData.total / stats.total) * 100) : 0;

                  return (
                    <div 
                      key={typeName} 
                      className={`flex items-center justify-between p-2 rounded-xl border ${
                        isDarkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50/60 border-slate-200/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium">{typeName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">({percentage}%)</span>
                        <div className="font-bold text-right">
                          <span className="text-emerald-400">{typeData.current}</span>
                          <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
                          <span className="text-slate-300 dark:text-slate-500">{typeData.total}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KEYBOARD SHORTCUTS PANEL */}
          <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold tracking-tight">Keyboard Shortcuts</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Pause / Play</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">Space</kbd>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Reset Sim</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">R</kbd>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Simulation Speeds</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">1 / 2 / 4</kbd>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Toggle Dark</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">D</kbd>
              </div>
              <div className="flex items-center justify-between text-xs py-1 col-span-2 border-t border-slate-800/80 pt-2 mt-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Trigger Light phase manual override</span>
                <div className="flex gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-emerald-400">G (Green)</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-amber-400">Y (Yellow)</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-red-400">S (Stop)</kbd>
                </div>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer className={`py-6 px-6 border-t text-center transition-colors duration-300 mt-auto ${
        isDarkMode ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <p className="text-xs font-semibold tracking-tight">
          MetroGrid Smart Traffic System Model &copy; 2026. Made with Google AI Studio.
        </p>
      </footer>

    </div>
  );
}
