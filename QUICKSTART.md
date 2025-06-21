# 🚀 Quick Start Guide - PhotoTrade Mobile App

## Prerequisites

Before you start, make sure you have:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **npm** (comes with Node.js)
3. **Expo CLI** (we'll install this automatically)

## 🎯 Quick Setup (3 Steps)

### Step 1: Run the Setup Script
```bash
./setup.sh
```

This will:
- Check if Node.js and npm are installed
- Install Expo CLI globally
- Install all dependencies for both mobile app and server
- Create necessary directories

### Step 2: Start the Backend Server
```bash
cd server
npm run dev
```

You should see:
```
🚀 Photo Trading Server running on port 5000
📱 API available at http://localhost:5000/api
🔒 Screenshot prevention and watermarking enabled
```

### Step 3: Start the Mobile App
In a **new terminal window**:
```bash
npm start
```

This will open the Expo development server. You can then:
- **Press `i`** - Open iOS simulator
- **Press `a`** - Open Android emulator  
- **Scan QR code** - Use Expo Go app on your phone

## 📱 Testing Options

### Option 1: iOS Simulator (macOS only)
1. Install Xcode from App Store
2. Press `i` when Expo server starts
3. App will open in iOS Simulator

### Option 2: Android Emulator
1. Install Android Studio
2. Create an Android Virtual Device (AVD)
3. Press `a` when Expo server starts

### Option 3: Physical Device (Recommended)
1. Install **Expo Go** app from App Store/Google Play
2. Scan the QR code from the terminal
3. App will load on your phone

## 🔧 Troubleshooting

### "npm command not found"
```bash
# Install Node.js first
# macOS (using Homebrew):
brew install node

# Ubuntu/Debian:
sudo apt update
sudo apt install nodejs npm

# Windows: Download from https://nodejs.org/
```

### "cd: no such file or directory: server"
The setup script will create the server directory automatically. Just run:
```bash
./setup.sh
```

### Port 5000 already in use
```bash
# Kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change the port in server/index.js
```

### Expo CLI not found
```bash
npm install -g @expo/cli
```

## 🧪 Test the API

Once the server is running, test it:
```bash
curl http://localhost:5000/api/health
```

You should see:
```json
{"status":"OK","message":"Photo Trading API is running"}
```

## 📱 App Features to Test

1. **Registration/Login** - Create an account
2. **Photo Upload** - Take photos or select from gallery
3. **Gallery View** - Browse your protected photos
4. **Trading** - Propose trades with other users
5. **Security** - Try taking screenshots (should be prevented)

## 🔒 Security Features

- **Screenshot Prevention**: Built-in using Expo Screen Capture
- **Watermarking**: All photos automatically watermarked
- **Protected Viewing**: Secure image viewer
- **Secure Storage**: Encrypted token storage

## 📞 Need Help?

1. Check the main README.md for detailed documentation
2. Run `./setup.sh` again if you encounter issues
3. Make sure both server and mobile app are running
4. Check that port 5000 is available

---

**Happy Trading! 📸🤝** 