// server.js
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const filesRouter = require('./routes/files')
const fileController = require('./controllers/fileController');
const cron = require('node-cron');

require('dotenv').config();
const PORT = process.env.PORT;


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});


app.use(limiter);

app.use("/files" , filesRouter)

// Start server
app.listen(PORT, () => {
  // console.log(`File sharing API server running at http://localhost:${PORT}`);
});

cron.schedule('* * * * * *', () => {
  fileController.cronDelete()
})

module.exports = app