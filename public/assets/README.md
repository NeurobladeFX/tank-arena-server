# 🎨 Vehicle Assets Directory

This folder contains all vehicle images for Tank Arena.

## 📊 Current Status

### ✅ Complete Vehicles:
- **Tank**: All 5 levels (basic, medium, heavy, battle, elite)

### 🔄 Partial Vehicles:
- **Jeep**: Level 1 only (basic)

### ⏳ Missing Vehicles:
- **APC**: All levels (will show orange colored shape)
- **Artillery**: All levels (will show purple colored shape)
- **Helicopter**: All levels (will show cyan colored shape)
- **Mech**: All levels (will show red colored shape)

## 🎯 Image Naming Convention

Format: `[vehicle]_[level]_[part].png`

### Levels:
- `basic` = Level 1
- `combat/medium/heavy` = Level 2 (varies by vehicle)
- `assault/siege/heavy` = Level 3 (varies by vehicle)
- `battle/raider/mobile` = Level 4 (varies by vehicle)
- `elite/commando/titan/super` = Level 5 (varies by vehicle)

### Parts:
- `body` = Main vehicle chassis
- `turret` = Rotating weapon on top

## 📝 To Add New Images:

1. Create PNG image (512x512 recommended)
2. Name it correctly (see examples below)
3. Drop it in this folder
4. Restart server
5. Done! ✅

## 🖼️ Image Examples

### Tank (✅ All Complete):
```
✅ tank_basic_body.png
✅ tank_basic_turret.png
✅ tank_medium_body.png
✅ tank_medium_turret.png
✅ tank_heavy_body.png
✅ tank_heavy_turret.png
✅ tank_battle_body.png
✅ tank_battle_turret.png
✅ tank_elite_body.png
✅ tank_elite_turret.png
```

### Jeep (Partial):
```
✅ jeep_basic_body.png
✅ jeep_basic_turret.png
⏳ jeep_combat_body.png (Level 2)
⏳ jeep_combat_turret.png (Level 2)
⏳ jeep_assault_body.png (Level 3)
⏳ jeep_assault_turret.png (Level 3)
⏳ jeep_raider_body.png (Level 4)
⏳ jeep_raider_turret.png (Level 4)
⏳ jeep_commando_body.png (Level 5)
⏳ jeep_commando_turret.png (Level 5)
```

## ⚙️ Image Specifications

- **Format**: PNG with transparency
- **Size**: 512x512 pixels (or any square size)
- **Orientation**: Vehicle facing RIGHT (→)
- **View**: Top-down perspective
- **Background**: Transparent

## 🔍 Current Files

Check this directory to see which images you already have!

## 🎮 Game Behavior

- **Image exists** → Uses the image
- **Image missing** → Shows colored fallback shape
- **No coding required** → Just drop images and restart!

---

**Tip**: Focus on completing one vehicle type at a time for best visual consistency! 🎨
