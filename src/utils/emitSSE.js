export function emitSSE(event, data) {
  if (global.sseClients && global.sseClients.length > 0) {
    global.sseClients.forEach((client) => {
      client.write(`event: ${event}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
}