# 🎮 Tank Arena - Multiplayer Battle Game

A fully-functional multiplayer battle game featuring tanks, jeeps, APCs, artillery, helicopters, and mechs!

## ✨ Features

- **6 Different Vehicle Types**: Tank, Jeep, APC, Artillery, Helicopter, Mech
- **5 Upgrade Levels**: Each vehicle has 5 progressive upgrade levels
- **Real-time Multiplayer**: Battle with up to 50 players simultaneously
- **Smart Image System**: Works with available images and gracefully falls back to colored shapes
- **Mobile Support**: Touch controls for mobile devices
- **Leaderboard**: Real-time ranking system
- **Experience & Leveling**: Collect XP to upgrade your vehicle

## 🚀 Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to:
```
http://localhost:10000
```

## 🎨 Adding New Vehicle Images

The game is designed to work **flexibly** with images. It will:
- ✅ Use images when available
- ✅ Show colored shapes when images are missing
- ✅ Automatically use new images when you add them

### Image Naming Convention

Place PNG images in the `public/assets/` folder following this pattern:

#### Tank Images (All 5 levels supported):
```
tank_basic_body.png      + tank_basic_turret.png     (Level 1) ✅ Available
tank_medium_body.png     + tank_medium_turret.png    (Level 2) ✅ Available
tank_heavy_body.png      + tank_heavy_turret.png     (Level 3) ✅ Available
tank_battle_body.png     + tank_battle_turret.png    (Level 4) ✅ Available
tank_elite_body.png      + tank_elite_turret.png     (Level 5) ✅ Available
```

#### Jeep Images:
```
jeep_basic_body.png      + jeep_basic_turret.png     (Level 1) ✅ Available
jeep_combat_body.png     + jeep_combat_turret.png    (Level 2) ⏳ Add when ready
jeep_assault_body.png    + jeep_assault_turret.png   (Level 3) ⏳ Add when ready
jeep_raider_body.png     + jeep_raider_turret.png    (Level 4) ⏳ Add when ready
jeep_commando_body.png   + jeep_commando_turret.png  (Level 5) ⏳ Add when ready
```

#### APC Images:
```
apc_basic_body.png       + apc_basic_turret.png      (Level 1) ⏳ Add when ready
apc_heavy_body.png       + apc_heavy_turret.png      (Level 2) ⏳ Add when ready
apc_battle_body.png      + apc_battle_turret.png     (Level 3) ⏳ Add when ready
apc_assault_body.png     + apc_assault_turret.png    (Level 4) ⏳ Add when ready
apc_titan_body.png       + apc_titan_turret.png      (Level 5) ⏳ Add when ready
```

#### Artillery Images:
```
artillery_basic_body.png     + artillery_basic_turret.png     (Level 1) ⏳ Add when ready
artillery_heavy_body.png     + artillery_heavy_turret.png     (Level 2) ⏳ Add when ready
artillery_siege_body.png     + artillery_siege_turret.png     (Level 3) ⏳ Add when ready
artillery_mobile_body.png    + artillery_mobile_turret.png    (Level 4) ⏳ Add when ready
artillery_super_body.png     + artillery_super_turret.png     (Level 5) ⏳ Add when ready
```

#### Helicopter Images:
```
helicopter_basic_body.png    + helicopter_basic_turret.png    (Level 1) ⏳ Add when ready
helicopter_attack_body.png   + helicopter_attack_turret.png   (Level 2) ⏳ Add when ready
helicopter_gunship_body.png  + helicopter_gunship_turret.png  (Level 3) ⏳ Add when ready
helicopter_heavy_body.png    + helicopter_heavy_turret.png    (Level 4) ⏳ Add when ready
helicopter_elite_body.png    + helicopter_elite_turret.png    (Level 5) ⏳ Add when ready
```

#### Mech Images:
```
mech_basic_body.png      + mech_basic_turret.png     (Level 1) ⏳ Add when ready
mech_assault_body.png    + mech_assault_turret.png   (Level 2) ⏳ Add when ready
mech_heavy_body.png      + mech_heavy_turret.png     (Level 3) ⏳ Add when ready
mech_battle_body.png     + mech_battle_turret.png    (Level 4) ⏳ Add when ready
mech_titan_body.png      + mech_titan_turret.png     (Level 5) ⏳ Add when ready
```

### 📝 Image Guidelines

- **Format**: PNG with transparency recommended
- **Size**: 512x512 pixels or similar square dimensions
- **Body Image**: The main vehicle chassis
- **Turret Image**: The rotating gun/weapon on top
- **No Setup Required**: Just drop images in `/public/assets/` and restart the server!

## 🌐 Deploy to Render

### Step 1: Prepare Your Repository

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - Tank Arena Game"
```

2. Create a GitHub repository and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/tank-arena.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

   **Name**: `tank-arena` (or your preferred name)
   
   **Environment**: `Node`
   
   **Build Command**: `npm install`
   
   **Start Command**: `npm start`
   
   **Instance Type**: `Free` (or paid for better performance)

5. Click **"Create Web Service"**

### Step 3: Wait for Deployment

- Render will automatically build and deploy your game
- You'll get a URL like: `https://tank-arena.onrender.com`
- Share this URL with your friends to play!

### Important Notes for Render:

✅ The game is configured to run on port 10000 (Render compatible)
✅ Health check endpoint available at `/health`
✅ All assets will be served correctly
✅ WebSocket connections are supported

## 🎮 How to Play

### Desktop Controls:
- **W/S or Arrow Keys**: Move forward/backward
- **A/D or Arrow Keys**: Rotate vehicle
- **Mouse**: Aim turret
- **Click**: Shoot

### Mobile Controls:
- **Touch and Drag**: Move and rotate vehicle
- **Fire Button**: Shoot

### Gameplay:
1. Choose your vehicle type
2. Enter your name
3. Battle other players
4. Collect XP orbs (purple) to level up
5. Collect health packs (green) to heal
6. Destroy enemies to gain points
7. Upgrade to stronger vehicles at each level!

## 📊 Vehicle Stats

### Tank (Balanced):
- Medium health, medium damage, medium speed
- Best for: All-around combat

### Jeep (Speed):
- Low health, low damage, **high speed**
- Best for: Hit and run tactics

### APC (Tank):
- **High health**, low damage, slow speed
- Best for: Frontline assault

### Artillery (Power):
- Low health, **very high damage**, very slow
- Best for: Long-range bombardment

### Helicopter (Agility):
- Low health, low damage, high speed, **high fire rate**
- Best for: Harassment and mobility

### Mech (Hybrid):
- Medium-high health, high damage, medium speed
- Best for: Heavy assault

## 🛠️ Technical Stack

- **Backend**: Node.js + Express
- **Real-time**: Socket.IO
- **Frontend**: HTML5 Canvas + Vanilla JavaScript
- **Rendering**: Custom 2D engine with camera system

## 📦 File Structure

```
tank-arena/
├── public/
│   ├── assets/          # Vehicle images go here
│   ├── game.js          # Main game logic
│   ├── index.html       # Game interface
│   └── style.css        # Styling
├── server.js            # Game server
├── package.json         # Dependencies
└── README.md           # This file
```

## 🔧 Customization

### Adding More Vehicles:
Edit `vehicleSystem` in both `server.js` and `game.js` to add new vehicle types.

### Changing Map Size:
Modify `MAP_SIZE` in `server.js` (default: 4000x4000)

### Adjusting Max Players:
Change `MAX_PLAYERS` in `server.js` (default: 50)

## 🐛 Troubleshooting

### Images not loading?
- Check the file names match exactly (case-sensitive)
- Ensure images are in `/public/assets/`
- The game will show colored shapes as fallback - this is normal!

### Game won't start?
- Check console for errors (F12 in browser)
- Ensure server is running on correct port
- Try clearing browser cache

### Can't connect to multiplayer?
- Check your firewall settings
- Ensure WebSocket connections are allowed
- On Render, wait a few minutes after deployment

## 📝 License

Free to use and modify for your projects!

## 🎉 Credits

Created for epic tank battles! Enjoy the game and happy fragging! 🚀💥

---

**Pro Tip**: Start with Tank or Jeep images fully complete, then gradually add other vehicles as you create them. The game works perfectly even with just one vehicle type having images!
