const MAX_NAME_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 500;
const PAGE_SIZE = 200;

const HTML_PAGE = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>みんなの掲示板</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif;
    background: #f4f5f7;
    color: #1b1f23;
  }
  header {
    background: #2d3748;
    color: #fff;
    padding: 1.25rem 1rem;
    text-align: center;
  }
  header h1 { margin: 0; font-size: 1.4rem; }
  main {
    max-width: 640px;
    margin: 1.5rem auto;
    padding: 0 1rem;
  }
  form {
    background: #fff;
    border-radius: 10px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }
  form label {
    display: block;
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
    color: #555;
  }
  form input[type="text"], form textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
    margin-bottom: 0.75rem;
    font-family: inherit;
  }
  form textarea { resize: vertical; min-height: 4rem; }
  form button {
    background: #2b6cb0;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    cursor: pointer;
  }
  form button:disabled { opacity: 0.6; cursor: not-allowed; }
  #status { font-size: 0.85rem; color: #c53030; margin-bottom: 0.5rem; min-height: 1.1em; }
  .post {
    background: #fff;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    margin-bottom: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .post .meta {
    font-size: 0.8rem;
    color: #718096;
    margin-bottom: 0.35rem;
    display: flex;
    justify-content: space-between;
  }
  .post .name { font-weight: bold; color: #2d3748; }
  .post .message { white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
  #empty { text-align: center; color: #888; padding: 2rem 0; }
</style>
</head>
<body>
<header><h1>みんなの掲示板</h1></header>
<main>
  <form id="post-form">
    <label for="name">名前(省略可)</label>
    <input type="text" id="name" maxlength="${MAX_NAME_LENGTH}" placeholder="名無しさん">
    <label for="message">メッセージ</label>
    <textarea id="message" maxlength="${MAX_MESSAGE_LENGTH}" required placeholder="ここに書き込みを入力してください"></textarea>
    <div id="status"></div>
    <button type="submit">書き込む</button>
  </form>
  <div id="posts"></div>
  <div id="empty" hidden>まだ書き込みがありません。最初の投稿をしてみましょう。</div>
</main>
<script>
const postsEl = document.getElementById('posts');
const emptyEl = document.getElementById('empty');
const form = document.getElementById('post-form');
const nameInput = document.getElementById('name');
const messageInput = document.getElementById('message');
const statusEl = document.getElementById('status');

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP');
}

function renderPosts(posts) {
  postsEl.innerHTML = '';
  emptyEl.hidden = posts.length > 0;
  for (const post of posts) {
    const div = document.createElement('div');
    div.className = 'post';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = post.name;
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatDate(post.created_at);
    meta.appendChild(nameSpan);
    meta.appendChild(timeSpan);

    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = post.message;

    div.appendChild(meta);
    div.appendChild(msg);
    postsEl.appendChild(div);
  }
}

async function loadPosts() {
  const res = await fetch('/api/posts');
  if (!res.ok) return;
  const data = await res.json();
  renderPosts(data.posts);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  const message = messageInput.value.trim();
  if (!message) {
    statusEl.textContent = 'メッセージを入力してください。';
    return;
  }
  const submitBtn = form.querySelector('button');
  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.value.trim(), message })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      statusEl.textContent = data.error || '投稿に失敗しました。';
      return;
    }
    messageInput.value = '';
    await loadPosts();
  } catch (err) {
    statusEl.textContent = '通信エラーが発生しました。';
  } finally {
    submitBtn.disabled = false;
  }
});

loadPosts();
</script>
</body>
</html>`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function handlePostsGet(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, message, created_at FROM posts ORDER BY id DESC LIMIT ?'
  )
    .bind(PAGE_SIZE)
    .all();
  return jsonResponse({ posts: results });
}

async function handlePostsCreate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: '不正なリクエストです。' }, 400);
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';

  if (!rawMessage) {
    return jsonResponse({ error: 'メッセージを入力してください。' }, 400);
  }
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ error: `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください。` }, 400);
  }
  if (rawName.length > MAX_NAME_LENGTH) {
    return jsonResponse({ error: `名前は${MAX_NAME_LENGTH}文字以内で入力してください。` }, 400);
  }

  const name = rawName || '名無しさん';

  const result = await env.DB.prepare(
    'INSERT INTO posts (name, message) VALUES (?, ?) RETURNING id, name, message, created_at'
  )
    .bind(name, rawMessage)
    .first();

  return jsonResponse({ post: result }, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/posts') {
      if (request.method === 'GET') return handlePostsGet(env);
      if (request.method === 'POST') return handlePostsCreate(request, env);
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(HTML_PAGE, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
