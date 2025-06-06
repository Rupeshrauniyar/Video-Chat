const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5000 });
let clients = [];
wss.on('connection', ws => {
  ws.id = uuidv4(); // Assign a unique ID
  clients.push(ws);

  ws.on('message', rawMessage => {
    const message = JSON.parse(rawMessage);
    message.senderId = ws.id; // Tag sender ID
    const stringified = JSON.stringify(message);

    // Forward message to all other clients
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(stringified);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
});
