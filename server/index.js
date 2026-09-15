const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });

  res.end(
    JSON.stringify({
      status: 'ok',
      message: 'Load shedding API is running.',
      port: PORT,
    })
  );
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
