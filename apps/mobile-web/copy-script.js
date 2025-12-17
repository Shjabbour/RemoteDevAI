const fs = require('fs');
const content = fs.readFileSync('app.js.backup', 'utf8');
fs.writeFileSync('app_socketio.js', content, 'utf8');
console.log('Copied');
