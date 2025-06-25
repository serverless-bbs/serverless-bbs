import type { Passkey, User } from '../types';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * WebAuthn (Passkeys) 的服务器端逻辑辅助函数
 */

// 获取或创建用户，用于 Passkey 注册
export async function getUser(db: D1Database, username: string, email: string): Promise<User | null> {
  // 检查用户是否已存在
  let user = await db.prepare('SELECT * FROM Users WHERE username = ? OR email = ?').bind(username, email).first<User>();
  return user;
}

export async function getOrCreateUser(db: D1Database, username: string, email: string): Promise<User> {
  // 检查用户是否已存在
  let user = await db.prepare('SELECT * FROM Users WHERE username = ? OR email = ?').bind(username, email).first<User>();
  if (user) {
    return user;
  }

  // 创建新用户
  const newUserId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const newUser: User = {
    id: newUserId,
    username,
    email,
    created_at: now,
    level: 1, // 默认等级，可根据实际需求调整
    role: 'user' // 默认角色，可根据实际需求调整
  };

  // 使用 batch 确保原子性操作
  await db.batch([
    db.prepare('INSERT INTO Users (id, username, email, created_at) VALUES (?, ?, ?, ?)')
      .bind(newUser.id, newUser.username, newUser.email, newUser.created_at),
    db.prepare('INSERT INTO Credits (user_id, last_updated) VALUES (?, ?)')
      .bind(newUser.id, now)
  ]);

  return newUser;
}

// 获取用户的 Passkeys
export async function getUserPasskeys(db: D1Database, userId: string): Promise<Passkey[]> {
  const { results } = await db.prepare('SELECT * FROM Passkeys WHERE user_id = ?').bind(userId).all<Passkey>();
  return results || [];
}

// 获取指定 ID 的 Passkey
export async function getPasskeyById(db: D1Database, id: string): Promise<Passkey | null> {
  return await db.prepare('SELECT * FROM Passkeys WHERE id = ?').bind(id).first<Passkey>();
}
