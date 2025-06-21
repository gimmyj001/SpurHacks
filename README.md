# PhotoTrade - Secure Mobile Photo Trading App

A secure mobile photo trading application for friends with built-in screenshot prevention and watermarking features.

## 🚀 Features

### Security Features
- **Screenshot Prevention**: Built-in Expo screen capture prevention
- **Watermarking**: Automatic user-specific watermarks on all photos
- **Protected Viewing**: Secure image viewing with additional protection layers
- **Secure Storage**: Encrypted token storage using Expo SecureStore
- **Permission Management**: Proper camera and photo library permissions

### Core Features
- **User Authentication**: Secure login/registration with JWT tokens
- **Photo Management**: Upload, view, and manage your photo collection
- **Trading System**: Propose and manage trades with friends
- **Real-time Updates**: Live trade notifications and status updates
- **Mobile Optimized**: Native mobile experience with smooth animations

## 📱 Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Real-time**: Socket.io
- **Image Processing**: Sharp + Canvas for watermarking
- **Security**: Expo Screen Capture, SecureStore, Image Picker

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd SpurHacks
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install mobile app dependencies
npm install
```

### 3. Start the Backend Server
```bash
# In the server directory
cd server
npm run dev
```

The server will start on `http://localhost:5000`

### 4. Start the Mobile App
```bash
# In the root directory
npm start
```

This will open the Expo development server. You can then:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan the QR code with Expo Go app on your phone

## 📱 Mobile App Setup

### For iOS Development
1. Install Xcode from the App Store
2. Install iOS Simulator
3. Run `npm run ios` to start the iOS simulator

### For Android Development
1. Install Android Studio
2. Set up Android Virtual Device (AVD)
3. Run `npm run android` to start the Android emulator

### For Physical Device Testing
1. Install Expo Go app from App Store/Google Play
2. Scan the QR code from the Expo development server
3. The app will load on your device

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the server directory:
```env
JWT_SECRET=your-secret-key-here
PORT=5000
```

### API Configuration
Update the API base URL in the mobile app if needed:
- Default: `http://localhost:5000`
- For physical device testing: Use your computer's IP address

## 🚀 Usage

### 1. Registration/Login
- Create a new account or sign in with existing credentials
- All authentication data is securely stored

### 2. Photo Management
- **Upload Photos**: Take new photos or select from gallery
- **View Gallery**: Browse your protected photo collection
- **Security**: All photos are automatically watermarked

### 3. Trading System
- **Select Friends**: Choose users to trade with
- **Propose Trades**: Select your photo and their photo for exchange
- **Manage Trades**: Accept, decline, or view trade history

### 4. Security Features
- **Screenshot Prevention**: Built-in protection against screenshots
- **Watermarking**: User-specific watermarks on all shared photos
- **Secure Viewing**: Protected image viewer with additional security

## 🔒 Security Implementation

### Screenshot Prevention
- **Expo Screen Capture**: Built-in prevention using `expo-screen-capture`
- **Protected Viewing**: Additional security layers in image viewer
- **Watermarking**: Automatic user attribution on all photos

### Data Protection
- **Secure Storage**: JWT tokens stored in Expo SecureStore
- **Encrypted Communication**: HTTPS API communication
- **Permission Management**: Proper camera and photo library access

### Image Security
- **Automatic Watermarking**: User-specific watermarks added on upload
- **Protected Display**: Images shown in secure viewer only
- **Access Control**: User-specific photo access permissions

## 📱 Mobile-Specific Features

### Native Camera Integration
- Direct camera access for photo capture
- Photo library selection with permissions
- Image editing and cropping capabilities

### Touch-Optimized UI
- Gesture-based navigation
- Touch-friendly buttons and controls
- Smooth animations and transitions

### Offline Capabilities
- Cached data for offline viewing
- Sync when connection restored
- Local storage for user preferences

## 🏗️ Project Structure

```
SpurHacks/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Mobile app dependencies
├── server/                # Backend server
│   ├── index.js          # Express server
│   ├── package.json      # Server dependencies
│   └── uploads/          # Photo storage
└── src/
    ├── contexts/         # React contexts
    │   └── AuthContext.tsx
    └── screens/          # App screens
        ├── LoginScreen.tsx
        ├── RegisterScreen.tsx
        ├── DashboardScreen.tsx
        ├── GalleryScreen.tsx
        ├── TradeScreen.tsx
        └── ProfileScreen.tsx
```

## 🚀 Deployment

### Building for Production
```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android
```

### Publishing to App Stores
1. Configure app.json with your app details
2. Build production versions
3. Submit to Apple App Store and Google Play Store

## 🔧 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS build issues:**
```bash
cd ios && pod install && cd ..
```

**Android build issues:**
```bash
cd android && ./gradlew clean && cd ..
```

**Permission issues:**
- Ensure camera and photo library permissions are granted
- Check device settings for app permissions

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review Expo documentation

---

**Note**: This app includes screenshot prevention features, but no security system is 100% foolproof. The app provides multiple layers of protection to discourage unauthorized photo sharing.
