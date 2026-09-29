const express = require('express');
const cors = require('cors');

const { attachUser } = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(attachUser);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
