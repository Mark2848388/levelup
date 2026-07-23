const express = require('express');
const WebSocket = require('ws');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.get('/', (req, res) => {
  res.send('🚀 Сервер видеозвонков работает!');
});

const server = app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});

const wss = new WebSocket.Server({ server });
const rooms = {};

wss.on('connection', (ws) => {
  console.log('🔌 Новое подключение');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'join') {
        if (!rooms[data.room]) {
          rooms[data.room] = { host: ws };
          ws.send(JSON.stringify({ type: 'joined', role: 'host' }));
        } else {
          rooms[data.room].guest = ws;
          ws.send(JSON.stringify({ type: 'joined', role: 'guest' }));
          if (rooms[data.room].host) {
            rooms[data.room].host.send(JSON.stringify({ type: 'guest-joined' }));
          }
        }
      }
      
      if (data.type === 'signal') {
        const room = rooms[data.room];
        if (room) {
          const target = data.to === 'host' ? room.host : room.guest;
          if (target && target !== ws) {
            target.send(JSON.stringify({
              type: 'signal',
              data: data.data
            }));
          }
        }
      }
    } catch (e) {
      console.log('Ошибка:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Отключение');
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.host === ws || room.guest === ws) {
        delete rooms[roomId];
        console.log(`🗑️ Комната ${roomId} удалена`);
      }
    }
  });
});

console.log('📡 WebSocket сервер готов!');
