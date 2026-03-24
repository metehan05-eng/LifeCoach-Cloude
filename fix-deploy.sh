#!/bin/bash

echo "🔧 LifeCoach AI Deploy Fix Script"
echo "================================="

# 1. Clean cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Git status check
echo "📋 Git status:"
git status

# 4. Add and commit changes
echo "💾 Adding changes..."
git add .
git commit -m "Fix: Performance optimizations and cache headers"

# 5. Push to trigger new deploy
echo "🚀 Pushing to trigger new deploy..."
git push origin main

echo ""
echo "✅ Done! Check Vercel dashboard for deployment status."
echo "🌐 After deployment, clear your browser cache and test:"
echo "   - https://han-ai.dev"
echo "   - https://life-coach-cloude-kappa.vercel.app"
