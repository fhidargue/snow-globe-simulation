# Real-Time Snow Globe Simulation using Position Based Dynamics

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![WebGL](https://img.shields.io/badge/WebGL-real--time-orange)
![Three.js](https://img.shields.io/badge/Three.js-supported-black)
![Position Based Dynamics](https://img.shields.io/badge/Position%20Based%20Dynamics-PBD-brightgreen)
![GPU Instancing](https://img.shields.io/badge/GPU%20Instancing-enabled-brightgreen)
![Physically Based Rendering](https://img.shields.io/badge/PBR-enabled-brightgreen)

This project consists in a real-time interactive snow globe simulation inspired by Position Based Dynamics (PBD), granular material behavior, and particle-based snow simulation research.

This project investigates how physical particle systems can be used to approximate snow-like behavior in an interactive computer graphics environment while maintaining real-time performance.

# Live Demo

For a real-time simulation demo, please visit: https://snow-globe-simulation.vercel.app/

# Technologies Used

- TypeScript
- WebGL
- Three.js
- React Three Fiber
- Zustand
- Leva
- SCSS Modules
- Vite
- GPU Instanced Rendering
- Physically Based Rendering (PBR)

# Table of Contents

1. [Installation](#1-installation)
2. [Overview](#2-overview)
3. [Technical Features](#3-technical-features)
4. [Literature Review](#4-literature-review)
5. [Mathematical Foundations](#5-mathematical-foundations)
6. [Snow Material Investigation](#6-snow-material-investigation)
7. [Real-Time Interaction](#7-real-time-interaction)
8. [System Architecture](#8-system-architecture)
9. [Limitations](#9-limitations)
10. [Future Work](#10-future-work)
11. [Conclusion](#11-conclusion)
12. [References](#12-references)

# 1. Installation

### 1.1 Requirements

- Node.js
- npm

Installation guide on how to intall node in your computer: https://nodejs.org/en/download

### 1.2 Clone the Repository

```bash
git clone <repository-url>
cd <project-folder>
```

### 1.3 Install Dependencies

```bash
npm install
```

### 1.4 Start Development Server

```bash
npm run dev
```

# 2. Overview

The simulation implements a custom particle based solver using `Position Based Dynamics (PBD)` principles combined with `Verlet integration`, `iterative collision constraints`, `spatial hashing`, and `material-specific behaviors`.

The project focuses on:

- Real-time particle simulation
- Granular snow behavior approximation
- Interactive globe manipulation
- Collision handling with multiple collider types
- Performance optimization for large particle counts
- Physically-inspired material behavior
- Real-time rendering using `Three.js` and `React Three Fiber`

The system supports two different material modes:

### 2.1 Marble Mode

A rigid granular particle simulation where particles behave as independent colliding spheres.

### 2.2 Snow Mode

An approximation of granular snow behavior where neighboring particles exhibit increased friction and clustered movement to simulate snow accumulation and settling.

# 3. Technical Features

### 3.1 Simulation

- Verlet Integration
- Position Based Dynamics (PBD)
- Iterative constraint solver
- Dynamic collisions
- Sleeping optimization system
- Real-time interaction forces

### 3.2 Optimization

- Spatial hashing
- Uniform grid neighbor search
- Instanced rendering
- Reduced allocations
- Typed array storage
- Constraint batching
- Framerate-independent damping

### 3.3 Rendering

- React Three Fiber
- Three.js
- HDR environment lighting
- Dynamic materials
- Instanced meshes
- Interactive globe rotation
- Physically based rendering (PBR)

# 4. Literature Review

The project is heavily inspired by modern real-time simulation research in computer graphics.

### 4.1 Position Based Dynamics

Position Based Dynamics (`Müller et al.`) was selected as the primary simulation framework due to its:

- Stability
- Simplicity
- Real-time performance
- Robust collision handling
- Interactive suitability

Unlike force-based approaches, PBD directly manipulates particle positions through iterative constraints.

This allows stable real-time simulations even under large time steps.

### 4.2 Granular Snow Simulation

The project investigates concepts inspired by granular snow simulation research and adapts them into a real-time interactive particle system suitable for computer graphics applications.

The implementation focuses on interactive performance and visual plausibility within a Position Based Dynamics framework.

The resulting system reproduces several characteristic behaviors associated with granular snow materials, including:

- Increased neighbor friction
- Clustered movement
- Reduced tangential sliding
- Granular accumulation and settling

Rather than targeting fully physically-accurate snow deformation, the simulation prioritizes stability, responsiveness, and real-time interaction while maintaining visually convincing snow-like behavior.

# 5. Mathematical Foundations

### 5.1. Verlet Integration

Particle motion is updated using Verlet integration.

The next particle position is computed using:

$$
x_{t+\Delta t} = x_t + (x_t - x_{t-\Delta t}) + a\Delta t^2
$$

Where:

- $x_t$ is the current position
- $x_{t-\Delta t}$ is the previous position
- $a$ is acceleration
- $\Delta t$ is the timestep

Verlet integration was selected because:

- Velocities are implicit
- It is stable for particle systems
- It integrates naturally with PBD constraints
- It is widely used in real-time graphics applications

### 5.2 Position Based Dynamics (PBD) Constraints

The simulation uses iterative positional corrections to resolve collisions.

For particle-particle collision constraints:

$$
C(p_i,p_j)=\|p_i-p_j\|-d
$$

Where:

- $p_i$ and $p_j$ are particle positions
- $d$ is the minimum allowed distance

Constraint corrections are iteratively applied using normalized collision directions.

### 5.3 Spatial Hashing

To maintain real-time performance with thousands of interacting particles, the simulation implements spatial hashing for efficient neighbor searches.

Naive particle collision detection requires every particle to be compared against every other particle, resulting in a time complexity of:

$$
O(n^2)
$$

By partitioning the simulation space into discrete grid cells, collision queries become localized to nearby neighboring cells, reducing the average-case complexity to approximately:

$$
O(n)
$$

Grid cell coordinates are computed using:

$$
cell=\lfloor position/cellSize \rfloor
$$

This optimization significantly reduces the number of particle comparisons and was essential for supporting large particle counts while maintaining stable real-time performance.

### 5.4 Collision System

The simulation implements multiple collision constraints to maintain stable particle interactions within the environment.

Particle collisions are resolved using iterative positional corrections to prevent penetration and maintain minimum particle separation distances.

The globe boundary is represented using a spherical collision constraint:

$$
x^2+y^2+z^2=r^2
$$

where $r$ defines the radius of the snow globe.

If a particle moves beyond this boundary, its position is projected back onto the sphere surface, preventing particles from escaping the globe volume while preserving stable collision behavior.

Additional collision primitives are used throughout the environment, including:

- Ellipsoid collisions for the ground surface
- Box collisions for the cabin body, roof, and tree layers
- Cylinder collisions for tree trunks

These collision systems collectively provide stable environmental interaction while maintaining real-time performance.

# 6. Snow Material Investigation

One of the main research goals was approximating snow-like behavior using simplified particle interactions within a real-time `Position Based Dynamics` framework.

The final implementation reproduces several characteristic behaviors associated with granular snow materials, including:

- Increased neighbor friction
- Reduced tangential sliding
- Clustered settling
- Granular accumulation

Neighboring particles locally increase damping and friction, producing denser and more stable motion compared to the marble material mode.

This approach prioritizes stability, responsiveness, and visually convincing snow-like behavior while maintaining real-time performance.

# 7. Real-Time Interaction

The globe can be rotated interactively using mouse drag input.

The interaction system includes:

- Quaternion-based rotation
- Inertial damping
- Angular momentum approximation
- Local axis rotation
- Framerate-independent smoothing

This interaction directly influences particle acceleration by rotating the gravity vector into local globe space.

# 8. System Architecture

The project is structured into modular simulation components.

### 8.1 PBDSystem

Core simulation system handling:

- Integration
- Collision solving
- Spatial hashing
- Particle updates

### 8.2 Material Solvers

Separate simulation logic for:

- Marble behavior
- Snow behavior

### 8.3 Collision Modules

Reusable collision utilities:

- Sphere collisions
- Box collisions
- Cylinder collisions
- Friction handling

### 8.4 Rendering Layer

Responsible for:

- Particle instancing
- Lighting
- Materials
- HDR environment
- Scene rendering

# 9. Limitations

Although the simulation successfully approximates snow-like behavior, it is not a fully physically accurate snow simulation.

The implementation does not include:

- Material Point Method (MPM)
- Stress tensor calculations
- Elastic-plastic deformation
- Volume preservation
- Fracture mechanics
- Thermodynamic snow behavior

Instead, the project focuses on a simplified real-time approximation suitable for interactive graphics applications.

# 10. Future Work

Potential future improvements include:

- GPU compute simulation
- WebGPU implementation
- MLS-MPM snow simulation
- Particle deformation fields
- Dynamic snow accumulation
- Volumetric rendering
- Fracture and compression systems
- Fluid and phase-change simulation
- Adaptive solver iterations

# 11. Conclusion

This project demonstrates how `Position Based Dynamics` can be adapted for interactive real-time particle simulation in computer animation.

The final implementation successfully combines the following within a modular real-time graphics system:

- Physically-inspired simulation
- Collision handling
- Optimization techniques
- Interactive controls
- Stylized rendering

The project also highlights the challenges of approximating granular snow behavior using simplified particle constraints and demonstrates iterative experimentation through multiple simulation approaches.

# 12. References

- Clavet, S., Beaudoin, P., & Poulin, P. (2005). _Particle-based viscoelastic fluid simulation_. Proceedings of the 2005 ACM SIGGRAPH/Eurographics Symposium on Computer Animation. https://www.ligum.umontreal.ca/Clavet-2005-PVFS/pvfs.pdf

- Macklin, M., Müller, M., Chentanez, N., & Kim, T.-Y. (2014). _Unified particle physics for real-time applications_. ACM Transactions on Graphics (TOG), 33(4). https://mmacklin.com/uppfrta_preprint.pdf

- Macklin, M., & Müller, M. (2013). _Position based fluids_. ACM Transactions on Graphics (TOG), 32(4). https://mmacklin.com/pbf_sig_preprint.pdf

- Müller, M., Heidelberger, B., Hennix, M., & Ratcliff, J. (2007). _Position based dynamics_. Journal of Visual Communication and Image Representation, 18(2), 109–118. https://matthias-research.github.io/pages/publications/posBasedDyn.pdf

- Stomakhin, A., Schroeder, C., Chai, L., Teran, J., & Selle, A. (2013). _A material point method for snow simulation_. ACM Transactions on Graphics (TOG), 32(4). https://alexey.stomakhin.com/research/siggraph2013_snow.pdf
