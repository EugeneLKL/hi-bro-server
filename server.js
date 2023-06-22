// Backend code (server.js or API endpoint file)
const express = require('express');
const createNewPost = require('./createPost.js');

const app = express();

app.use(express.json());

app.post('/api/posts', createNewPost);

app.listen(5000, () => {
  console.log('Server started on port 5000');
});
