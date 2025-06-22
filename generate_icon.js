const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a 1024x1024 canvas
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Set background gradient
const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1024, 1024);

// Add a subtle pattern overlay
ctx.globalAlpha = 0.1;
for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(
        Math.random() * 1024,
        Math.random() * 1024,
        Math.random() * 100 + 50,
        0,
        2 * Math.PI
    );
    ctx.fillStyle = '#ffffff';
    ctx.fill();
}
ctx.globalAlpha = 1;

// Create main icon elements
// Camera body
ctx.fillStyle = '#ffffff';
ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
ctx.shadowBlur = 20;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;

// Camera body
ctx.fillRect(300, 400, 424, 300);
ctx.fillRect(350, 350, 324, 50);

// Camera lens
ctx.beginPath();
ctx.arc(512, 550, 80, 0, 2 * Math.PI);
ctx.fillStyle = '#2c3e50';
ctx.fill();

// Inner lens
ctx.beginPath();
ctx.arc(512, 550, 60, 0, 2 * Math.PI);
ctx.fillStyle = '#34495e';
ctx.fill();

// Lens reflection
ctx.beginPath();
ctx.arc(500, 540, 20, 0, 2 * Math.PI);
ctx.fillStyle = '#ecf0f1';
ctx.fill();

// Camera flash
ctx.fillStyle = '#f39c12';
ctx.fillRect(450, 320, 124, 20);

// Photo frames (representing trading)
ctx.fillStyle = '#e74c3c';
ctx.fillRect(200, 200, 120, 80);
ctx.fillRect(704, 200, 120, 80);
ctx.fillRect(200, 744, 120, 80);
ctx.fillRect(704, 744, 120, 80);

// Add some photo content to frames
ctx.fillStyle = '#ffffff';
ctx.fillRect(210, 210, 100, 60);
ctx.fillRect(714, 210, 100, 60);
ctx.fillRect(210, 754, 100, 60);
ctx.fillRect(714, 754, 100, 60);

// Add arrows to show trading
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 8;
ctx.lineCap = 'round';

// Arrow from top left to camera
ctx.beginPath();
ctx.moveTo(320, 240);
ctx.lineTo(450, 500);
ctx.stroke();

// Arrow from camera to top right
ctx.beginPath();
ctx.moveTo(574, 500);
ctx.lineTo(704, 240);
ctx.stroke();

// Arrow from camera to bottom left
ctx.beginPath();
ctx.moveTo(450, 600);
ctx.lineTo(320, 784);
ctx.stroke();

// Arrow from camera to bottom right
ctx.beginPath();
ctx.moveTo(574, 600);
ctx.lineTo(704, 784);
ctx.stroke();

// Add arrowheads
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.moveTo(450, 500);
ctx.lineTo(440, 490);
ctx.lineTo(440, 510);
ctx.closePath();
ctx.fill();

ctx.beginPath();
ctx.moveTo(574, 500);
ctx.lineTo(584, 490);
ctx.lineTo(584, 510);
ctx.closePath();
ctx.fill();

ctx.beginPath();
ctx.moveTo(450, 600);
ctx.lineTo(440, 590);
ctx.lineTo(440, 610);
ctx.closePath();
ctx.fill();

ctx.beginPath();
ctx.moveTo(574, 600);
ctx.lineTo(584, 590);
ctx.lineTo(584, 610);
ctx.closePath();
ctx.fill();

// Save the icon
const buffer = canvas.toBuffer('image/png');
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}
fs.writeFileSync(path.join(assetsDir, 'icon.png'), buffer);

console.log('Cool icon generated successfully at assets/icon.png!'); 