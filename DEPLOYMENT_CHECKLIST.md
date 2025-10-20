# 🚀 Deployment Checklist for Render

Follow these steps to deploy Tank Arena to Render.com

## ✅ Pre-Deployment Checklist

- [x] Game runs locally (`npm start` works)
- [x] All dependencies listed in `package.json`
- [x] Server configured for production (PORT env variable)
- [x] Health check endpoint available (`/health`)
- [x] Static files properly served
- [x] WebSocket support configured
- [x] `.gitignore` file created

## 📋 Step-by-Step Deployment

### Step 1: Create GitHub Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Tank Arena multiplayer game"
   ```

2. **Create GitHub repo**:
   - Go to https://github.com/new
   - Repository name: `tank-arena` (or your choice)
   - Make it Public or Private
   - Don't add README/gitignore (we already have them)
   - Click "Create repository"

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tank-arena.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render

1. **Sign up/Login to Render**:
   - Go to https://render.com
   - Click "Get Started for Free" or "Sign In"
   - Connect your GitHub account

2. **Create New Web Service**:
   - Click "New +" button (top right)
   - Select "Web Service"
   - Click "Connect" next to your GitHub repository
   - If you don't see it, click "Configure account" to grant access

3. **Configure the Service**:
   
   **Basic Settings:**
   - **Name**: `tank-arena` (or your preferred name)
   - **Region**: Choose closest to your target audience
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   
   **Build & Deploy:**
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   
   **Instance:**
   - **Instance Type**: `Free` (or select paid plan for better performance)

4. **Environment Variables** (Optional):
   - Click "Advanced"
   - Add environment variables if needed:
     - `NODE_ENV` = `production` (optional)

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (usually 2-5 minutes)

### Step 3: Verify Deployment

Once deployed, you'll get a URL like: `https://tank-arena-xxxx.onrender.com`

**Test the following:**

- [ ] Website loads correctly
- [ ] Vehicle selection screen appears
- [ ] Can enter player name
- [ ] Game starts when clicking "START BATTLE"
- [ ] Tank images load (check in game)
- [ ] Jeep images load
- [ ] Other vehicles show colored shapes (normal - images not added yet)
- [ ] Can move vehicle with WASD
- [ ] Can shoot with mouse click
- [ ] Multiplayer works (open in 2 tabs to test)
- [ ] Leaderboard updates
- [ ] Health/score displays work

### Step 4: Share Your Game!

🎉 **Your game is live!** Share the URL with friends.

**Example URLs:**
- Your game: `https://tank-arena-xxxx.onrender.com`
- Health check: `https://tank-arena-xxxx.onrender.com/health`

## 🔧 Post-Deployment Configuration

### Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click "Settings"
3. Scroll to "Custom Domain"
4. Add your domain and follow DNS instructions

### Performance Tuning

**Free Tier Limitations:**
- Server sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month free (roughly 1 app running 24/7)

**To Upgrade:**
1. Go to service Settings
2. Change "Instance Type" to paid tier
3. Benefits:
   - No sleeping
   - Better performance
   - More memory/CPU
   - SSL certificate included

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify `package.json` has all dependencies
- Ensure Node version compatibility

### Game Won't Load
- Check "Logs" tab in Render dashboard
- Verify `/health` endpoint returns 200 OK
- Clear browser cache and try again

### Images Not Loading
- Check if images exist in `public/assets/`
- Verify file names match exactly (case-sensitive)
- Images should be committed to git
- The game will show colored shapes as fallback (this is normal!)

### WebSocket Issues
- Render supports WebSockets by default
- Check browser console for connection errors
- Verify `socket.io` is properly installed

### Server Keeps Restarting
- Check logs for Node.js errors
- Verify port configuration (`process.env.PORT || 10000`)
- Check memory usage in dashboard

## 📊 Monitoring Your Game

### Render Dashboard:
- **Metrics**: View CPU, memory, bandwidth usage
- **Logs**: Real-time server logs
- **Events**: Deployment history

### Useful Metrics:
- Active players: Check `/health` endpoint
- Server uptime: Shows in metrics
- Request volume: Bandwidth graphs

## 🔄 Updating Your Game

After making changes locally:

```bash
git add .
git commit -m "Description of changes"
git push
```

Render will **automatically redeploy** your game!

## 💰 Cost Breakdown

**Free Tier:**
- ✅ 750 hours/month
- ✅ Auto-sleep after 15 min
- ✅ 512 MB RAM
- ✅ Shared CPU

**Starter Plan (~$7/month):**
- ✅ Always on (no sleep)
- ✅ 512 MB RAM
- ✅ Better performance
- ✅ Great for small games

**Pro Plan (~$85/month):**
- ✅ 4 GB RAM
- ✅ Dedicated CPU
- ✅ Handle 100+ concurrent players

## 📱 Mobile Optimization

Your game already supports mobile! Test on:
- [ ] iPhone/iPad (Safari)
- [ ] Android phones (Chrome)
- [ ] Tablets
- [ ] Different screen sizes

## 🎮 Adding More Vehicle Images

After deployment, you can add more images:

1. **Add images** to `public/assets/` locally
2. **Follow naming convention** (see IMAGE_GUIDE.md)
3. **Commit and push**:
   ```bash
   git add public/assets/
   git commit -m "Add new vehicle images"
   git push
   ```
4. **Render auto-deploys** in ~2 minutes
5. **Images appear** in game automatically!

## 📧 Support

If you encounter issues:

1. Check Render documentation: https://render.com/docs
2. Check browser console (F12) for errors
3. Review server logs in Render dashboard
4. Test locally first: `npm start`

## ✨ Success Checklist

After deployment, you should have:

- [x] Live game URL
- [x] Health check endpoint working
- [x] Multiplayer functionality
- [x] Images loading for Tank and Jeep
- [x] Colored fallbacks for other vehicles
- [x] Mobile controls working
- [x] Leaderboard updating
- [x] No console errors

## 🎉 You're Done!

Your Tank Arena game is now live and ready for players!

**Next Steps:**
1. Share the URL with friends
2. Add more vehicle images over time
3. Monitor player feedback
4. Enjoy the battles! 🚀💥

---

**Pro Tips:**
- Keep the free tier for testing
- Upgrade when you have regular players
- Add images gradually (game works fine without all of them)
- Monitor logs for any errors
- Have fun! 🎮
