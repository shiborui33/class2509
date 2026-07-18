const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');

function readPosts() {
  try {
    const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

// Get all posts
app.get('/api/posts', (_req, res) => {
  const posts = readPosts();
  res.json(posts);
});

// Get single post
app.get('/api/posts/:id', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  res.json(post);
});

// Create new post
app.post('/api/posts', (req, res) => {
  const { title, author, role, content } = req.body;
  if (!title || !author || !content) {
    return res.status(400).json({ error: '标题、作者和内容不能为空' });
  }
  const posts = readPosts();
  const newPost = {
    id: posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    title,
    author,
    role: role || 'student',
    content,
    timestamp: new Date().toISOString(),
    replies: []
  };
  posts.unshift(newPost);
  writePosts(posts);
  res.status(201).json(newPost);
});

// Reply to post
app.post('/api/posts/:id/reply', (req, res) => {
  const { author, role, content } = req.body;
  if (!author || !content) {
    return res.status(400).json({ error: '作者和内容不能为空' });
  }
  const posts = readPosts();
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const reply = {
    id: post.replies.length ? Math.max(...post.replies.map(r => r.id)) + 1 : 1,
    author,
    role: role || 'student',
    content,
    timestamp: new Date().toISOString()
  };
  post.replies.push(reply);
  writePosts(posts);
  res.status(201).json(reply);
});

// Fallback: serve index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏫 班级网站服务已启动: http://localhost:${PORT}`);
  console.log(`   - 前端页面: http://localhost:${PORT}`);
  console.log(`   - 论坛API:  http://localhost:${PORT}/api/posts`);
});
