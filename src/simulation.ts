/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehicleType, SignalState } from './types';

export class Vehicle {
  id: string;
  type: VehicleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  maxSpeed: number;
  color: string;
  lane: 'top' | 'bottom'; // top is left-to-right, bottom is right-to-left
  isBraking: boolean = false;
  hasPassed: boolean = false;
  length: number;

  // Visual features
  stripeColor?: string;
  hasSunroof: boolean = false;
  roofRailsColor?: string;
  cargoColor?: string;

  constructor(
    id: string,
    type: VehicleType,
    x: number,
    y: number,
    lane: 'top' | 'bottom'
  ) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.lane = lane;

    // Distinguish specs by vehicle type
    const colors = [
      '#EF4444', '#3B82F6', '#10B981', '#F59E0B', 
      '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6', 
      '#F97316', '#06B6D4'
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];

    switch (type) {
      case VehicleType.SPORTS_CAR:
        this.width = 52;
        this.height = 24;
        this.maxSpeed = 3.5 + Math.random() * 0.8;
        this.stripeColor = Math.random() > 0.5 ? '#FFFFFF' : '#111827';
        break;
      case VehicleType.LUXURY_SEDAN:
        this.width = 56;
        this.height = 23;
        this.maxSpeed = 2.8 + Math.random() * 0.5;
        this.hasSunroof = Math.random() > 0.4;
        break;
      case VehicleType.SUV:
        this.width = 50;
        this.height = 26;
        this.maxSpeed = 2.4 + Math.random() * 0.4;
        this.roofRailsColor = '#374151';
        break;
      case VehicleType.PICKUP_TRUCK:
        this.width = 54;
        this.height = 25;
        this.maxSpeed = 2.5 + Math.random() * 0.3;
        this.cargoColor = '#4B5563';
        break;
      case VehicleType.DELIVERY_VAN:
        this.width = 62;
        this.height = 27;
        this.maxSpeed = 2.0 + Math.random() * 0.3;
        this.color = Math.random() > 0.6 ? '#F9FAFB' : this.color; // many vans are white
        break;
      case VehicleType.TRUCK:
        this.width = 85;
        this.height = 28;
        this.maxSpeed = 1.6 + Math.random() * 0.3;
        this.color = '#1E3A8A'; // solid blue or green cab
        this.cargoColor = '#D1D5DB'; // large metal container
        break;
      case VehicleType.MOTORCYCLE:
        this.width = 30;
        this.height = 12;
        this.maxSpeed = 3.2 + Math.random() * 0.6;
        break;
      default:
        this.width = 50;
        this.height = 22;
        this.maxSpeed = 2.5;
    }

    this.length = this.width;
    this.speed = this.maxSpeed * (0.8 + Math.random() * 0.2);
  }

  update(
    speedMultiplier: number,
    leadingVehicle: Vehicle | null,
    signalState: SignalState,
    stopLineX: number,
    zebraCrossingX: number
  ) {
    const dt = speedMultiplier;
    const isTopLane = this.lane === 'top';
    const directionFactor = isTopLane ? 1 : -1;

    // Base acceleration and deceleration rates
    const accel = 0.08 * dt;
    const decel = 0.15 * dt;

    let targetSpeed = this.maxSpeed;
    this.isBraking = false;

    // Traffic Signal Check
    const distToStop = isTopLane 
      ? stopLineX - this.x 
      : this.x - stopLineX;

    const hasPassedStopLine = isTopLane 
      ? this.x > stopLineX 
      : this.x < stopLineX;

    if (!hasPassedStopLine) {
      if (signalState === SignalState.RED) {
        // Stop before the line if we haven't crossed it
        if (distToStop > 0 && distToStop < 280) {
          targetSpeed = 0;
          this.isBraking = true;
        }
      } else if (signalState === SignalState.YELLOW) {
        // Slow down if not too close to the intersection, otherwise proceed
        if (distToStop > 120 && distToStop < 240) {
          targetSpeed = this.maxSpeed * 0.3;
          this.isBraking = true;
        }
      }
    }

    // Vehicle Collision Avoidance Check
    if (leadingVehicle) {
      const spacing = isTopLane 
        ? leadingVehicle.x - leadingVehicle.width/2 - (this.x + this.width/2)
        : (this.x - this.width/2) - (leadingVehicle.x + leadingVehicle.width/2);
      
      const safeGap = 35 + (this.speed * 8); // dynamic safe gap depending on current speed

      if (spacing < safeGap) {
        if (spacing < 15) {
          // Critical backup stopping
          targetSpeed = 0;
          this.isBraking = true;
        } else {
          // Gradual matching
          targetSpeed = Math.min(targetSpeed, leadingVehicle.speed * 0.9);
          this.isBraking = true;
        }
      }
    }

    // Apply Acceleration/Deceleration smoothly
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + accel);
    } else if (this.speed > targetSpeed) {
      this.speed = Math.max(targetSpeed, this.speed - decel);
    }

    // Move
    this.x += this.speed * directionFactor * dt;

    // Check if vehicle has fully cleared the crossing
    if (!this.hasPassed) {
      const crossed = isTopLane 
        ? this.x - this.width/2 > zebraCrossingX + 40
        : this.x + this.width/2 < zebraCrossingX - 40;
      if (crossed) {
        this.hasPassed = true;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, isDarkMode: boolean) {
    const isTopLane = this.lane === 'top';
    
    ctx.save();
    ctx.translate(this.x, this.y);
    // top lane moves left-to-right (0 angle), bottom lane moves right-to-left (180 deg)
    if (!isTopLane) {
      ctx.rotate(Math.PI);
    }

    // 1. Vector Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = isDarkMode ? 6 : 4;
    ctx.shadowOffsetY = isDarkMode ? 5 : 4;
    ctx.shadowOffsetX = 1;

    // Draw the main shadow base to ensure high contrast
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(-this.width/2, -this.height/2 + 2, this.width, this.height, 5);
    ctx.fill();

    // Disable standard shadow to draw crisp elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;

    // 2. Wheels
    ctx.fillStyle = '#111827';
    const wheelW = this.width * 0.22;
    const wheelH = 4;
    const wheelY1 = -this.height/2 - 1.5;
    const wheelY2 = this.height/2 - 2.5;
    const wheelX1 = -this.width/2 + this.width * 0.18;
    const wheelX2 = this.width/2 - this.width * 0.32;

    // Draw 4 tires extending slightly from body
    ctx.fillRect(wheelX1, wheelY1, wheelW, wheelH);
    ctx.fillRect(wheelX2, wheelY1, wheelW, wheelH);
    ctx.fillRect(wheelX1, wheelY2, wheelW, wheelH);
    ctx.fillRect(wheelX2, wheelY2, wheelW, wheelH);

    // 3. Main Car Body
    const bodyGrad = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
    bodyGrad.addColorStop(0, this.color);
    // Darken body at the bottom for 3D depth
    bodyGrad.addColorStop(1, this.adjustBrightness(this.color, -25));
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    // Rounded vehicle frame
    ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 6);
    ctx.fill();

    // 4. Details based on vehicle type
    if (this.type === VehicleType.SPORTS_CAR) {
      // Racing stripes
      if (this.stripeColor) {
        ctx.fillStyle = this.stripeColor;
        ctx.fillRect(-this.width/2, -4, this.width * 0.7, 2);
        ctx.fillRect(-this.width/2, 2, this.width * 0.7, 2);
      }
      // Rear spoiler
      ctx.fillStyle = '#111827';
      ctx.fillRect(-this.width/2 - 2, -this.height/2 + 2, 4, this.height - 4);
    } else if (this.type === VehicleType.LUXURY_SEDAN) {
      // Chrome front grill line
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.width/2 - 2, -this.height/3);
      ctx.lineTo(this.width/2 - 2, this.height/3);
      ctx.stroke();

      // Sunroof
      if (this.hasSunroof) {
        ctx.fillStyle = '#1F2937';
        ctx.fillRect(-this.width * 0.08, -6, this.width * 0.18, 12);
      }
    } else if (this.type === VehicleType.SUV) {
      // Robust front/back bumpers
      ctx.fillStyle = '#374151';
      ctx.fillRect(this.width/2 - 3, -this.height/2 + 2, 3, this.height - 4);
      ctx.fillRect(-this.width/2, -this.height/2 + 1, 3, this.height - 2);
      // Roof rails
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(-this.width * 0.25, -this.height/2 + 2, this.width * 0.55, 1.5);
      ctx.fillRect(-this.width * 0.25, this.height/2 - 3.5, this.width * 0.55, 1.5);
    } else if (this.type === VehicleType.PICKUP_TRUCK) {
      // Bed partition
      ctx.fillStyle = '#111827';
      ctx.fillRect(-this.width/2 + 3, -this.height/2 + 2, this.width * 0.45, this.height - 4);
      // Tool box inside bed or details
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(-this.width/2 + 3, -this.height/2 + 4, 3, this.height - 8);
    } else if (this.type === VehicleType.DELIVERY_VAN) {
      // Distinct tall/wide look details (panel lines)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Back doors vertical partition line
      ctx.moveTo(-this.width/2 + 2, -this.height/2);
      ctx.lineTo(-this.width/2 + 2, this.height/2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-this.width/2 + 2, 0);
      ctx.lineTo(-this.width/10, 0);
      ctx.stroke();
    } else if (this.type === VehicleType.TRUCK) {
      // Flatbed container cabin line
      const cabinWidth = this.width * 0.3;
      const cargoWidth = this.width * 0.65;

      // Overwrite body with cargo container
      if (this.cargoColor) {
        ctx.fillStyle = this.cargoColor;
        // Big cargo box
        ctx.beginPath();
        ctx.roundRect(-this.width/2, -this.height/2 + 1, cargoWidth, this.height - 2, 2);
        ctx.fill();

        // Ribs of shipping container for texture
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (let i = -this.width/2 + 8; i < -this.width/2 + cargoWidth; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i, -this.height/2 + 2);
          ctx.lineTo(i, this.height/2 - 2);
          ctx.stroke();
        }
      }

      // Connecting hitch
      ctx.fillStyle = '#374151';
      ctx.fillRect(-this.width/2 + cargoWidth, -4, 4, 8);
    } else if (this.type === VehicleType.MOTORCYCLE) {
      // Narrow motorcycle body: handlebars, wheels
      ctx.fillStyle = '#111827';
      // Front and back fat tires
      ctx.fillRect(this.width/2 - 5, -2, 5, 4);
      ctx.fillRect(-this.width/2, -2, 5, 4);

      // Handlebars
      ctx.fillRect(this.width * 0.15, -7, 2, 14);

      // Rider helmet (circle)
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(-this.width * 0.1, 0, 4.5, 0, 2 * Math.PI);
      ctx.fill();

      // Rider vest
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-this.width * 0.3, -3, 6, 6);
    }

    // 5. Windows & Windshield (all except motorcycle)
    if (this.type !== VehicleType.MOTORCYCLE) {
      ctx.fillStyle = '#2A3B4D'; // dark glass tint
      const windX = this.width * 0.1;
      const windY = -this.height/2 + 2.5;
      const windW = this.width * 0.45;
      const windH = this.height - 5;

      ctx.beginPath();
      // Curved windshield and side windows frame
      ctx.roundRect(windX, windY, windW, windH, 3);
      ctx.fill();

      // Windshield reflection
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.28, -this.height/2 + 5);
      ctx.lineTo(this.width * 0.38, this.height/2 - 5);
      ctx.stroke();

      // Side mirrors
      ctx.fillStyle = this.color;
      ctx.fillRect(this.width * 0.22, -this.height/2 - 2, 3, 2);
      ctx.fillRect(this.width * 0.22, this.height/2, 3, 2);
    }

    // 6. Lights
    // Headlights (glowing yellow/white)
    ctx.fillStyle = '#FFFDE7';
    ctx.shadowColor = '#FEF08A';
    ctx.shadowBlur = isDarkMode ? 10 : 2;
    ctx.beginPath();
    ctx.arc(this.width/2 - 1, -this.height/3, 2, -Math.PI/2, Math.PI/2);
    ctx.arc(this.width/2 - 1, this.height/3, 2, -Math.PI/2, Math.PI/2);
    ctx.fill();

    // Brake lights (Red/orange)
    ctx.shadowBlur = 0; // Clear headlight glow
    ctx.fillStyle = this.isBraking ? '#EF4444' : '#991B1B';
    if (this.isBraking) {
      ctx.shadowColor = '#F87171';
      ctx.shadowBlur = isDarkMode ? 12 : 5;
    }
    ctx.fillRect(-this.width/2, -this.height/2 + 2, 1.5, 4);
    ctx.fillRect(-this.width/2, this.height/2 - 6, 1.5, 4);

    ctx.restore();
  }

  // Helper utility to adjust color brightness
  private adjustBrightness(hex: string, percent: number): string {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.max(0, Math.min(255, R + percent));
    G = Math.max(0, Math.min(255, G + percent));
    B = Math.max(0, Math.min(255, B + percent));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }
}

export class Pedestrian {
  id: string;
  x: number;
  y: number;
  targetY: number;
  speed: number;
  direction: 'up' | 'down'; // up is bottom-to-top, down is top-to-bottom
  color: string;
  headColor: string = '#F3F4F6';
  clothingColor: string;
  size: number;
  stride: number = 0;
  isFinished: boolean = false;

  constructor(
    id: string,
    x: number,
    y: number,
    targetY: number,
    direction: 'up' | 'down'
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.targetY = targetY;
    this.direction = direction;

    // Pedestrian attributes
    this.speed = 0.5 + Math.random() * 0.4;
    this.size = 5 + Math.random() * 2; // radius

    const colors = [
      '#EF4444', '#3B82F6', '#10B981', '#EC4899', 
      '#F59E0B', '#8B5CF6', '#14B8A6', '#F97316'
    ];
    this.clothingColor = colors[Math.floor(Math.random() * colors.length)];
    this.color = this.clothingColor;
  }

  update(speedMultiplier: number) {
    const dy = this.speed * speedMultiplier;
    if (this.direction === 'down') {
      this.y += dy;
      if (this.y >= this.targetY) {
        this.isFinished = true;
      }
    } else {
      this.y -= dy;
      if (this.y <= this.targetY) {
        this.isFinished = true;
      }
    }
    // Update stride phase for animation
    this.stride += 0.15 * speedMultiplier;
  }

  draw(ctx: CanvasRenderingContext2D, isDarkMode: boolean) {
    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(this.x + 1, this.y + 4, this.size - 1, 0, 2 * Math.PI);
    ctx.fill();

    // Leg swings based on stride
    const swingDist = Math.sin(this.stride) * 3.5;
    ctx.fillStyle = '#111827'; // trousers/shoes
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y + swingDist, 1.8, 0, 2 * Math.PI);
    ctx.arc(this.x + 2, this.y - swingDist, 1.8, 0, 2 * Math.PI);
    ctx.fill();

    // Clothing Torso (Shoulder Line)
    ctx.fillStyle = this.clothingColor;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.size, this.size * 0.6, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FBCFE8'; // Skin tone simulation
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.45, 0, 2 * Math.PI);
    ctx.fill();

    // Hair or hat representation
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 0.5, this.size * 0.4, Math.PI, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
  }
}
