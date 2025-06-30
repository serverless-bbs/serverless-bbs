import { Hono } from 'hono';
import { authMiddleware } from '../auth/middleware';
import type { Bindings, User } from '../types';

const app = new Hono<{ Bindings: Bindings, Variables: { user: User } }>();

// 获取指定用户的公开信息
app.all('/:id', async (c) => {
  const id = c.req.param('id');
  if (id == 'me') {
    const user = c.get('user');
    return c.json(user);
  }

  try {
    const query = `
      SELECT
          u.id,
          u.username,
          u.created_at,
          u.avatar,
          c.balance as credits,
          (SELECT COUNT(*) FROM Threads WHERE author_id = u.id) as thread_count,
          (SELECT COUNT(*) FROM Replies WHERE author_id = u.id) as reply_count
      FROM Users u
      LEFT JOIN Credits c ON u.id = c.user_id
      WHERE u.id = ?
    `;
    const profile = await c.env.DB.prepare(query).bind(id).first();
    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }
    // 模拟一些其他数据以匹配 UI
    const fullProfile = {
      ...profile,
      last_visit_at: Date.now() / 1000 - 3600, // 模拟1小时前访问
      last_activity_at: Date.now() / 1000 - 1800,
      last_post_at: Date.now() / 1000 - 900,
      online_time: 1127,
      user_group: '银牌会员',
      silver_coins: (Number(profile.credits) || 0) * 0.8,
      gold_coins: (Number(profile.credits) || 0) * 0.2,
    };

    return c.json(fullProfile);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to fetch user profile ' }, 500);
  }
});

// 新增: 获取指定用户的所有主题帖
app.get('/:id/threads', async (c) => {
  const id = c.req.param('id');
  try {
    const user = await c.env.DB.prepare("SELECT id FROM Users WHERE id = ?").bind(id).first<{ id: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const query = `
            SELECT
                t.id,
                t.title,
                t.created_at,
                t.reply_count,
                t.view_count,
                n.name as node_name,
                n.id as node_id
            FROM Threads t
            JOIN Nodes n ON t.node_id = n.id
            WHERE t.author_id = ?
            ORDER BY t.created_at DESC
        `;
    const { results } = await c.env.DB.prepare(query).bind(user.id).all();

    return c.json(results);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to fetch user threads' }, 500);
  }
});

// 所有路由都需要认证
app.use('*', authMiddleware);

// 新增: 处理头像上传
app.post('/me/avatar', async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData();
  const avatarFile = formData.get('avatar');

  if (!avatarFile || !(avatarFile instanceof File)) {
    return c.json({ error: 'No avatar file uploaded' }, 400);
  }

  // 生成一个唯一的文件名
  const avatarKey = `avatars/${user.id}/${crypto.randomUUID()}`;

  // 将 File 转为 ArrayBuffer
  const arrayBuffer = await avatarFile.arrayBuffer();

  // 上传文件到 R2
  await c.env.R2_BUCKET.put(avatarKey, arrayBuffer, {
    httpMetadata: { contentType: avatarFile.type },
  });

  const avatarUrl = `${c.env.R2_PUBLIC_URL}/${avatarKey}`;

  // 更新用户在 D1 中的头像 key
  await c.env.DB.prepare('UPDATE Users SET avatar = ? WHERE id = ?')
    .bind(avatarUrl, user.id)
    .run();

  return c.json({ message: 'Avatar updated successfully', avatarUrl });
});

export default app;
