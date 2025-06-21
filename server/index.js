const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for mobile app
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database setup
const db = new sqlite3.Database('photo_trading.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Photos table
  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    description TEXT,
    watermarked_filename TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Trades table
  db.run(`CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    from_photo_id INTEGER NOT NULL,
    to_photo_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users (id),
    FOREIGN KEY (to_user_id) REFERENCES users (id),
    FOREIGN KEY (from_photo_id) REFERENCES photos (id),
    FOREIGN KEY (to_photo_id) REFERENCES photos (id)
  )`);

  // Friends table
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending' or 'accepted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
  )`);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Watermarking function using Sharp
async function addWatermark(imagePath, username, outputPath) {
  try {
    // Create watermark text
    const watermarkText = `© ${username} - PhotoTrade`;
    
    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    const { width, height } = metadata;
    
    // Create watermark SVG
    const svgWatermark = `
      <svg width="${width}" height="${height}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.5"/>
          </filter>
        </defs>
        <text x="${width - 20}" y="${height - 20}" 
              font-family="Arial, sans-serif" 
              font-size="24" 
              fill="white" 
              text-anchor="end"
              filter="url(#shadow)">${watermarkText}</text>
        <text x="${width/2}" y="${height/2}" 
              font-family="Arial, sans-serif" 
              font-size="48" 
              fill="white" 
              fill-opacity="0.1" 
              text-anchor="middle"
              transform="rotate(-30 ${width/2} ${height/2})">${watermarkText}</text>
      </svg>
    `;
    
    // Composite the watermark onto the image
    await sharp(imagePath)
      .composite([{
        input: Buffer.from(svgWatermark),
        top: 0,
        left: 0
      }])
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Watermarking error:', error);
    return false;
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Photo Trading API is running' });
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        const userId = this.lastID;
        
        // Add default images for the new user
        const defaultImages = [
          {
            filename: 'IMG_6367.JPG',
            originalName: 'Default Image 1',
            description: 'Welcome to PhotoTrade! This is your first default image.'
          },
          {
            filename: 'IMG_6368.JPG',
            originalName: 'Default Image 2', 
            description: 'Welcome to PhotoTrade! This is your second default image.'
          }
        ];
        
        // Insert default images into database
        const insertPromises = defaultImages.map((img, index) => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO photos (user_id, filename, original_name, description, watermarked_filename) VALUES (?, ?, ?, ?, ?)',
              [userId, img.filename, img.originalName, img.description, img.filename],
              function(err) {
                if (err) {
                  console.error('Error inserting default image:', err);
                  reject(err);
                } else {
                  console.log(`Default image ${index + 1} added for user ${username}`);
                  resolve();
                }
              }
            );
          });
        });
        
        Promise.all(insertPromises)
          .then(() => {
            const token = jwt.sign({ id: userId, username }, JWT_SECRET);
            res.json({ 
              token, 
              user: { id: userId, username, email },
              message: 'Account created with 2 default images!'
            });
          })
          .catch((error) => {
            console.error('Error adding default images:', error);
            // Still return success even if default images fail
            const token = jwt.sign({ id: userId, username }, JWT_SECRET);
            res.json({ 
              token, 
              user: { id: userId, username, email },
              message: 'Account created!'
            });
          });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
      
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Upload photo with watermarking
app.post('/api/photos', authenticateToken, upload.single('photo'), async (req, res) => {
  const { description } = req.body;
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  
  try {
    // Create watermarked version
    const watermarkedFilename = `watermarked-${filename}`;
    const watermarkedPath = path.join('uploads', watermarkedFilename);
    
    const watermarkSuccess = await addWatermark(filePath, req.user.username, watermarkedPath);
    
    if (!watermarkSuccess) {
      return res.status(500).json({ error: 'Failed to process image' });
    }
    
    db.run(
      'INSERT INTO photos (user_id, filename, original_name, description, watermarked_filename) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, filename, originalName, description, watermarkedFilename],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        res.json({ 
          id: this.lastID,
          filename,
          watermarkedFilename,
          originalName,
          description,
          userId: req.user.id
        });
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Get user's photos (return watermarked versions for security)
app.get('/api/photos', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM photos WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, photos) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Return watermarked versions for security
      const securePhotos = photos.map(photo => ({
        ...photo,
        filename: photo.watermarked_filename || photo.filename
      }));
      
      res.json(securePhotos);
    }
  );
});

// Get user's photos by ID (for trading - always watermarked)
app.get('/api/users/:userId/photos', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM photos WHERE user_id = ? ORDER BY created_at DESC',
    [req.params.userId],
    (err, photos) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Always return watermarked versions for security
      const securePhotos = photos.map(photo => ({
        ...photo,
        filename: photo.watermarked_filename || photo.filename
      }));
      
      res.json(securePhotos);
    }
  );
});

// Get all users (for trading)
app.get('/api/users', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ? AND f.status = 'accepted'`,
    [req.user.id],
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(users);
    }
  );
});

// Create trade
app.post('/api/trades', authenticateToken, (req, res) => {
  const { toUserId, fromPhotoId, toPhotoId } = req.body;
  
  db.run(
    'INSERT INTO trades (from_user_id, to_user_id, from_photo_id, to_photo_id) VALUES (?, ?, ?, ?)',
    [req.user.id, toUserId, fromPhotoId, toPhotoId],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Notify the recipient via socket
      io.emit('new_trade', { 
        tradeId: this.lastID,
        fromUserId: req.user.id,
        toUserId 
      });
      
      res.json({ id: this.lastID });
    }
  );
});

// Get user's trades
app.get('/api/trades', authenticateToken, (req, res) => {
  db.all(`
    SELECT t.*, 
           f.username as from_username,
           f_photo.original_name as from_photo_name,
           f_photo.filename as from_photo_filename,
           t_photo.original_name as to_photo_name,
           t_photo.filename as to_photo_filename
    FROM trades t
    JOIN users f ON t.from_user_id = f.id
    JOIN photos f_photo ON t.from_photo_id = f_photo.id
    JOIN photos t_photo ON t.to_photo_id = t_photo.id
    WHERE t.from_user_id = ? OR t.to_user_id = ?
    ORDER BY t.created_at DESC
  `, [req.user.id, req.user.id], (err, trades) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(trades);
  });
});

// Accept trade
app.put('/api/trades/:tradeId/accept', authenticateToken, (req, res) => {
  const { tradeId } = req.params;

  // Get trade details including photo info
  db.get('SELECT from_user_id, to_user_id, from_photo_id, to_photo_id FROM trades WHERE id = ?', [tradeId], (err, trade) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    // Update the trade status
    db.run(
      'UPDATE trades SET status = ? WHERE id = ? AND to_user_id = ?',
      ['accepted', tradeId, req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Trade not found' });

        // Get both photo details
        db.get('SELECT * FROM photos WHERE id = ?', [trade.from_photo_id], (err1, fromPhoto) => {
          if (err1 || !fromPhoto) return res.status(500).json({ error: 'Database error (from photo)' });
          db.get('SELECT * FROM photos WHERE id = ?', [trade.to_photo_id], (err2, toPhoto) => {
            if (err2 || !toPhoto) return res.status(500).json({ error: 'Database error (to photo)' });

            // Insert a copy of toPhoto for from_user
            db.run(
              'INSERT INTO photos (user_id, filename, original_name, description, watermarked_filename) VALUES (?, ?, ?, ?, ?)',
              [trade.from_user_id, toPhoto.filename, toPhoto.original_name, toPhoto.description, toPhoto.watermarked_filename],
              function(err3) {
                if (err3) return res.status(500).json({ error: 'Database error (copy toPhoto)' });

                // Insert a copy of fromPhoto for to_user
                db.run(
                  'INSERT INTO photos (user_id, filename, original_name, description, watermarked_filename) VALUES (?, ?, ?, ?, ?)',
                  [trade.to_user_id, fromPhoto.filename, fromPhoto.original_name, fromPhoto.description, fromPhoto.watermarked_filename],
                  function(err4) {
                    if (err4) return res.status(500).json({ error: 'Database error (copy fromPhoto)' });

                    // Notify both users
                    io.to(`user_${trade.from_user_id}`).emit('trade_accepted', {
                      tradeId: tradeId,
                      fromUserId: trade.from_user_id,
                      toUserId: trade.to_user_id
                    });
                    io.to(`user_${trade.to_user_id}`).emit('trade_accepted', {
                      tradeId: tradeId,
                      fromUserId: trade.from_user_id,
                      toUserId: trade.to_user_id
                    });

                    res.json({ message: 'Trade accepted' });
                  }
                );
              }
            );
          });
        });
      }
    );
  });
});

// Decline trade
app.put('/api/trades/:tradeId/decline', authenticateToken, (req, res) => {
  const { tradeId } = req.params;
  
  // First get the trade details to notify the initiator
  db.get('SELECT from_user_id, to_user_id FROM trades WHERE id = ?', [tradeId], (err, trade) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    
    // Update the trade status
    db.run(
      'UPDATE trades SET status = ? WHERE id = ? AND to_user_id = ?',
      ['declined', tradeId, req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Trade not found' });
        
        // Notify the initiator that their trade was declined
        io.to(`user_${trade.from_user_id}`).emit('trade_declined', { 
          tradeId: tradeId,
          fromUserId: trade.from_user_id,
          toUserId: trade.to_user_id
        });
        
        // Also notify the decliner
        io.to(`user_${trade.to_user_id}`).emit('trade_declined', { 
          tradeId: tradeId,
          fromUserId: trade.from_user_id,
          toUserId: trade.to_user_id
        });
        
        res.json({ message: 'Trade declined' });
      }
    );
  });
});

// Add default images to existing users (for testing)
app.post('/api/add-default-images', authenticateToken, (req, res) => {
  // Check if user already has photos
  db.get('SELECT COUNT(*) as count FROM photos WHERE user_id = ?', [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'User already has photos' });
    }
    
    // Add default images
    const defaultImages = [
      {
        filename: 'IMG_6367.JPG',
        originalName: 'Default Image 1',
        description: 'Welcome to PhotoTrade! This is your first default image.'
      },
      {
        filename: 'IMG_6368.JPG',
        originalName: 'Default Image 2', 
        description: 'Welcome to PhotoTrade! This is your second default image.'
      }
    ];
    
    const insertPromises = defaultImages.map((img, index) => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO photos (user_id, filename, original_name, description, watermarked_filename) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, img.filename, img.originalName, img.description, img.filename],
          function(err) {
            if (err) {
              console.error('Error inserting default image:', err);
              reject(err);
            } else {
              console.log(`Default image ${index + 1} added for user ${req.user.username}`);
              resolve();
            }
          }
        );
      });
    });
    
    Promise.all(insertPromises)
      .then(() => {
        res.json({ message: 'Default images added successfully!' });
      })
      .catch((error) => {
        console.error('Error adding default images:', error);
        res.status(500).json({ error: 'Failed to add default images' });
      });
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- FRIENDS ENDPOINTS ---

// Send friend request
app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  if (!friendUsername) return res.status(400).json({ error: 'Missing friendUsername' });
  if (friendUsername === req.user.username) return res.status(400).json({ error: 'Cannot add yourself' });

  db.get('SELECT id FROM users WHERE username = ?', [friendUsername], (err, friend) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!friend) return res.status(404).json({ error: 'User not found' });
    const friendId = friend.id;
    // Check if already friends or pending
    db.get('SELECT * FROM friends WHERE user_id = ? AND friend_id = ?', [req.user.id, friendId], (err, row) => {
      if (row) return res.status(400).json({ error: 'Already sent request or already friends' });
      db.run('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [req.user.id, friendId, 'pending'], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Also create a reverse row for easier querying
        db.run('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [friendId, req.user.id, 'pending'], (err2) => {
          if (err2) return res.status(500).json({ error: 'Database error' });
          res.json({ message: 'Friend request sent!' });
        });
      });
    });
  });
});

// Accept friend request
app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Missing friendId' });
  // Set both directions to accepted
  db.run('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?', ['accepted', req.user.id, friendId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.run('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?', ['accepted', friendId, req.user.id], function(err2) {
      if (err2) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Friend request accepted!' });
    });
  });
});

// Decline friend request
app.post('/api/friends/decline', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Missing friendId' });
  // Remove both directions
  db.run('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [req.user.id, friendId, friendId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Friend request declined/removed.' });
  });
});

// List friends (accepted only)
app.get('/api/friends', authenticateToken, (req, res) => {
  db.all(`SELECT u.id, u.username, u.email FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ? AND f.status = 'accepted'`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// List pending friend requests (incoming)
app.get('/api/friends/requests', authenticateToken, (req, res) => {
  db.all(`SELECT u.id, u.username, u.email FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ? AND f.status = 'pending' AND u.id != ?`, [req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Remove a friend
app.post('/api/friends/remove', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Missing friendId' });
  db.run('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [req.user.id, friendId, friendId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Friend removed.' });
  });
});

// Update /api/users to only return friends
app.get('/api/users', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ? AND f.status = 'accepted'`,
    [req.user.id],
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(users);
    }
  );
});
// --- END FRIENDS ENDPOINTS ---

server.listen(PORT, () => {
  console.log(`🚀 Photo Trading Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
  console.log(`🔒 Screenshot prevention and watermarking enabled`);
}); 