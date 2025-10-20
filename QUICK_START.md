# ⚡ Quick Start Guide - Tank Arena

## 🎮 Play Locally (Right Now!)

```bash
npm install
npm start
```

Open browser to: **http://localhost:10000**

**That's it!** 🎉

## 🚀 Deploy to Render (5 Minutes!)

### 1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tank-arena.git
git push -u origin main
```

### 2. Deploy on Render:
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - Build: `npm install`
   - Start: `npm start`
5. Click "Create Web Service"

### 3. Done! 🎉
Your game will be live at: `https://tank-arena-xxxx.onrender.com`

## 🎨 Add Vehicle Images (Anytime!)

Just drop PNG files in `public/assets/`:

```
public/assets/
  ├── tank_basic_body.png     ✅ Already there!
  ├── tank_basic_turret.png   ✅ Already there!
  ├── jeep_basic_body.png     ✅ Already there!
  └── [add more images here]
```

**No code changes needed!** Game auto-detects images.

## 📖 Full Documentation

- **README.md** - Complete guide
- **IMAGE_GUIDE.md** - Image naming & specs
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment

## 🎯 Image Naming Format

```
[vehicle]_[level]_[part].png
```

Examples:
- `tank_basic_body.png`
- `jeep_combat_turret.png`
- `mech_elite_body.png`

## 🔥 What Works Right Now

✅ Full multiplayer gameplay
✅ 6 vehicle types (Tank, Jeep, APC, Artillery, Helicopter, Mech)
✅ 5 upgrade levels per vehicle
✅ Tank images (all 5 levels)
✅ Jeep images (level 1)
✅ Colored shapes for missing images
✅ Mobile support
✅ Leaderboard
✅ XP & leveling system
✅ Ready for Render deployment

## 🎮 Controls

**Desktop:**
- WASD or Arrows = Move
- Mouse = Aim
- Click = Shoot

**Mobile:**
- Touch & drag = Move
- Fire button = Shoot

## ❓ Need Help?

Check the logs:
```bash
# Browser: Press F12
# Server: Check terminal output
```

## 🌟 Current Game Status

**Images Available:**
- ✅ Tank: 100% complete (all 5 levels)
- ✅ Jeep: 20% complete (level 1 only)
- ⏳ APC: 0% (uses colored shapes)
- ⏳ Artillery: 0% (uses colored shapes)
- ⏳ Helicopter: 0% (uses colored shapes)
- ⏳ Mech: 0% (uses colored shapes)

**Game is fully playable!** Images are just visual polish.

## 🚀 Priority Tasks

1. ✅ **Game works** - You can play now!
2. ✅ **Deploy to Render** - Share with friends
3. ⏳ **Add more images** - Do this anytime

**Have fun!** 🎉💥🎮
