# Smart Traffic Management System

An interactive, high-fidelity real-time simulation of urban traffic flows, featuring queue logic, safety gaps, realistic traffic signals, dynamic pedestrian behavior, and a detailed glassmorphic statistics dashboard.

## Features

### 🚥 Smart Multi-Signal Control Override
- Supports **Automatic Signal Cycles** (Green 10s ➜ Yellow 3s ➜ Red 10s).
- Supports **Manual Overrides** allowing city managers to click Red, Yellow, or Green buttons to override traffic state instantly.
- Features glowing vector lanterns and high-DPI digital countdown HUD timers.

### 🚗 High-Detail Vehicle Simulation & Queue Engine
- Features **7 vehicle categories**: Sports Cars, Luxury Sedans, SUVs, Pickup Trucks, Delivery Vans, Heavy Trucks, and Motorcycles.
- High-fidelity vector rendering (including windshield reflections, tire extensions, headlights, brake lights, spoilers, roof rails, cargo containers, and dynamic lighting shadows).
- Advanced **collision avoidance** where leading vehicles are scanned, and trailing vehicles adjust velocity smoothly based on the formula:
  `safe gap = 35px + (current speed * 8)`
- Smooth queue compilation and deceleration/acceleration buffers.

### 🚶 Intelligent Pedestrian Systems
- Dynamic pedestrian spawning waves triggered during **Red light phases**.
- Walking animation with sinusoidal arm/leg stride swings based on frame updates.
- Pedestrians automatically finish crossing the road when the light turns back to Green before completing.

### 📊 Real-Time Glassmorphic Dashboard
- Dynamic bento-grid stats tracker indicating Active Vehicles on Road, Passed Vehicles, and Total Spawned.
- Detailed percentage breakdown by individual vehicle category.
- **Road Density Index** (Fluid, Moderate, Heavy, Gridlock) that updates dynamically based on active flows.

### ⚙️ Interactive Customizer Tools
- Speed controllers for **1x, 2x, and 4x** simulation pacing.
- **Spawn Intensity Slider** to change automatic generation frequencies.
- Theme switchers for pristine light/dark visual contrasts.
- Keyboard shortcuts for fluid workflow debugging.

---

## Technical Setup & Run Instructions

This project is built using **TypeScript, React, and HTML5 Canvas** to deliver ultra-smooth 60 FPS visual simulations on any modern browser.

### How to Run Locally

1. Clone or export the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser at:
   `http://localhost:3000`

### Keyboard Shortcuts Reference

- **`Spacebar`**: Pause or Resume simulation updates.
- **`R`**: Reset full simulation counters and clear roads.
- **`1` / `2` / `4`**: Change simulation speed multipliers.
- **`D`**: Toggle Dark / Light theme.
- **`F`**: Enter or exit fullscreen mode.
- **`G`**: Force Override Traffic Signal to **GREEN**.
- **`Y`**: Force Override Traffic Signal to **YELLOW**.
- **`S` / `O`**: Force Override Traffic Signal to **RED** (Stop phase).
