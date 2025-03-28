# Forest Adventure Game

A 3D action-adventure game where you play as a bear exploring a forest, collecting berries, and fighting off wildlife with your trusty hammer!

![Game Screenshot](public/screenshot.png)

## Game Features

- **Immersive 3D Environment**: Explore a procedurally generated forest with trees and obstacles
- **Dynamic Combat**: Swing your hammer to fight various forest creatures
- **Resource Collection**: Gather berries throughout the forest to increase your score
- **Enemy Variety**: Face different enemies including snakes, rabbits, and squirrels, each with unique behaviors
- **Health System**: Manage your health and avoid damage from enemies
- **Responsive Controls**: Intuitive keyboard movement (WASD) and mouse click for attacks

## Controls

- **W, A, S, D**: Move character
- **Mouse Click**: Swing hammer to attack
- **Mouse Movement**: Look around

## Technologies Used

- **Next.js**: React framework for the application structure
- **Three.js**: 3D rendering library for WebGL-based game
- **TypeScript**: Type-safe coding for better development experience
- **Tailwind CSS**: Styling the UI components

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Prerequisites

- Node.js 16.8.0 or later
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/forest-adventure.git
   cd forest-adventure
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   # or 
   pnpm install
   # or
   bun install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the game.

## Project Structure

The game is organized into a modular structure:

```
app/
├── components/     # UI components (GameHUD, GameOverScreen)
├── hooks/          # Custom hooks including useGameEngine
├── utils/          # Game utilities for enemies, environment
├── models/         # Type definitions and interfaces
└── page.tsx        # Main game entry point
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# berry-bonk
