# 🎨 Vehicle Image Guide for Tank Arena

## Current Status

### ✅ Currently Available Images:
- **Tank**: All 5 levels complete (basic, medium, heavy, battle, elite)
- **Jeep**: Level 1 complete (basic)

### ⏳ Missing Images (Will use colored shapes):
- **Jeep**: Levels 2-5
- **APC**: All levels
- **Artillery**: All levels
- **Helicopter**: All levels
- **Mech**: All levels

## How the Image System Works

The game is **smart and flexible**:

1. **If image exists** → Uses the image ✅
2. **If image missing** → Shows a colored shape fallback ✅
3. **When you add images** → Automatically uses them ✅

**No code changes needed!** Just drop images in the `public/assets/` folder.

## Image Naming Format

```
[vehicle_type]_[level_name]_[part].png
```

### Examples:
- `tank_basic_body.png` ✅
- `tank_basic_turret.png` ✅
- `jeep_combat_body.png` ⏳
- `helicopter_elite_turret.png` ⏳

## Complete Image List

### TANK (✅ Complete)
```
✅ tank_basic_body.png       ✅ tank_basic_turret.png
✅ tank_medium_body.png      ✅ tank_medium_turret.png
✅ tank_heavy_body.png       ✅ tank_heavy_turret.png
✅ tank_battle_body.png      ✅ tank_battle_turret.png
✅ tank_elite_body.png       ✅ tank_elite_turret.png
```

### JEEP (Partial - Level 1 only)
```
✅ jeep_basic_body.png       ✅ jeep_basic_turret.png
⏳ jeep_combat_body.png      ⏳ jeep_combat_turret.png
⏳ jeep_assault_body.png     ⏳ jeep_assault_turret.png
⏳ jeep_raider_body.png      ⏳ jeep_raider_turret.png
⏳ jeep_commando_body.png    ⏳ jeep_commando_turret.png
```

### APC (None yet)
```
⏳ apc_basic_body.png        ⏳ apc_basic_turret.png
⏳ apc_heavy_body.png        ⏳ apc_heavy_turret.png
⏳ apc_battle_body.png       ⏳ apc_battle_turret.png
⏳ apc_assault_body.png      ⏳ apc_assault_turret.png
⏳ apc_titan_body.png        ⏳ apc_titan_turret.png
```

### ARTILLERY (None yet)
```
⏳ artillery_basic_body.png      ⏳ artillery_basic_turret.png
⏳ artillery_heavy_body.png      ⏳ artillery_heavy_turret.png
⏳ artillery_siege_body.png      ⏳ artillery_siege_turret.png
⏳ artillery_mobile_body.png     ⏳ artillery_mobile_turret.png
⏳ artillery_super_body.png      ⏳ artillery_super_turret.png
```

### HELICOPTER (None yet)
```
⏳ helicopter_basic_body.png     ⏳ helicopter_basic_turret.png
⏳ helicopter_attack_body.png    ⏳ helicopter_attack_turret.png
⏳ helicopter_gunship_body.png   ⏳ helicopter_gunship_turret.png
⏳ helicopter_heavy_body.png     ⏳ helicopter_heavy_turret.png
⏳ helicopter_elite_body.png     ⏳ helicopter_elite_turret.png
```

### MECH (None yet)
```
⏳ mech_basic_body.png       ⏳ mech_basic_turret.png
⏳ mech_assault_body.png     ⏳ mech_assault_turret.png
⏳ mech_heavy_body.png       ⏳ mech_heavy_turret.png
⏳ mech_battle_body.png      ⏳ mech_battle_turret.png
⏳ mech_titan_body.png       ⏳ mech_titan_turret.png
```

## Image Specifications

### Recommended Settings:
- **Format**: PNG with transparency
- **Size**: 512x512 pixels (or any square size)
- **Background**: Transparent
- **Orientation**: Facing RIGHT (0 degrees = →)
- **Style**: Top-down view

### Two Parts Per Vehicle:
1. **Body** (`_body.png`): The vehicle chassis/main body
2. **Turret** (`_turret.png`): The rotating weapon on top

### Tips for Best Results:
- Keep similar visual style across all vehicles
- Ensure turret barrel points to the RIGHT
- Use transparency for non-vehicle areas
- Maintain consistent scaling between levels
- Higher levels should look more powerful/advanced

## Level Progression Guide

Each vehicle has 5 levels. Visual progression tips:

**Level 1 (Basic)**: Simple, starter vehicle
**Level 2**: Add some armor plating or upgrades
**Level 3**: Bulkier, more weapons
**Level 4**: Advanced tech, sleek design
**Level 5 (Elite)**: Ultimate form, impressive appearance

## Testing Your Images

1. **Add images** to `public/assets/` folder
2. **Restart the server**: `npm start`
3. **Open browser**: `http://localhost:10000`
4. **Select vehicle** and start game
5. **Check if images load** (console shows load status)

### Debugging:
- Press F12 to open browser console
- Look for: "✅ Loaded: /assets/your_image.png"
- Or: "⚠️ Image not found (will use fallback)"

## Quick Start Checklist

Want to add a new vehicle's images? Follow these steps:

- [ ] Create body image (e.g., `jeep_combat_body.png`)
- [ ] Create turret image (e.g., `jeep_combat_turret.png`)
- [ ] Save both as 512x512 PNG with transparency
- [ ] Place in `public/assets/` folder
- [ ] Restart server
- [ ] Test in game!

## Fallback Colors (When Images Missing)

If images aren't available, these colors are used:

- **Tank**: Green (#4CAF50)
- **Jeep**: Blue (#2196F3)
- **APC**: Orange (#FF9800)
- **Artillery**: Purple (#9C27B0)
- **Helicopter**: Cyan (#00BCD4)
- **Mech**: Red (#F44336)

## Priority Recommendation

**Suggested order for creating images:**

1. ✅ Tank (Already complete!)
2. ✅ Jeep Level 1 (Already complete!)
3. 🎯 Jeep Levels 2-5 (Complete the jeep line)
4. 🎯 APC Level 1 (Second most tanky vehicle)
5. 🎯 Mech Level 1 (Popular choice)
6. 🎯 Continue with other base levels
7. 🎯 Then add upgrade levels as time permits

## Examples from Your Current Assets

Your existing tank images follow the perfect format:
```
tank_basic_body.png    - ✅ Perfect naming!
tank_basic_turret.png  - ✅ Perfect naming!
```

Just follow this same pattern for all other vehicles!

## Need Help?

If images don't load:
1. Check file name spelling (case-sensitive!)
2. Ensure files are PNG format
3. Look at browser console (F12) for errors
4. The game will work anyway with colored shapes!

---

**Remember**: The game is fully playable right now! Images are just the visual polish. Add them at your own pace. 🎨✨
