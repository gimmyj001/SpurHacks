#!/bin/bash

echo "🚀 Setting up PhotoTrade Mobile App..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    echo "   Or use Homebrew (macOS): brew install node"
    echo "   Or use apt (Ubuntu): sudo apt install nodejs npm"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install Expo CLI globally
echo "📱 Installing Expo CLI..."
npm install -g @expo/cli

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "🔧 Installing server dependencies..."
cd server
npm install
cd ..

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p server/uploads

echo ""
echo "🎉 Setup complete! Here's how to run the app:"
echo ""
echo "1. Start the backend server:"
echo "   cd server && npm run dev"
echo ""
echo "2. In a new terminal, start the mobile app:"
echo "   npm start"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:5000/api/health"
echo ""
echo "📱 Mobile App Options:"
echo "   - Press 'i' for iOS simulator"
echo "   - Press 'a' for Android emulator"
echo "   - Scan QR code with Expo Go app on your phone"
echo ""
echo "🔒 Security Features:"
echo "   - Screenshot prevention enabled"
echo "   - Automatic watermarking"
echo "   - Secure image viewing"
echo "" 