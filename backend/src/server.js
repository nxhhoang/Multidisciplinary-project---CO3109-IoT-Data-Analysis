const app = require('./app');

const port = Number(process.env.PORT || 4000);

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});
