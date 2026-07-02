/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum VehicleType {
  SPORTS_CAR = 'Sports Car',
  LUXURY_SEDAN = 'Luxury Sedan',
  SUV = 'SUV',
  PICKUP_TRUCK = 'Pickup Truck',
  DELIVERY_VAN = 'Delivery Van',
  TRUCK = 'Truck',
  MOTORCYCLE = 'Motorcycle',
}

export enum SignalState {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export interface SimulationConfig {
  speedMultiplier: number;
  isPaused: boolean;
  isDarkMode: boolean;
  spawnRate: number; // 1 to 5
}

export interface VehicleStats {
  onRoad: number;
  passed: number;
  total: number;
  byType: Record<VehicleType, { current: number; total: number }>;
}

export interface PedestrianStats {
  crossingCount: number;
  totalCrossed: number;
}
