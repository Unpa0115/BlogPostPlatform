import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './railway'

export interface User {
  id: string
  email: string
  created_at: Date
  updated_at: Date
}

export interface AuthUser extends User {
  password_hash: string
}

// ユーザー登録
export async function registerUser(email: string, password: string): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 12)
  
  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at, updated_at',
    [email, hashedPassword]
  )
  
  return result.rows[0]
}

// ユーザーログイン
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
  const result = await db.query(
    'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
    [email]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  const user = result.rows[0] as AuthUser
  const isValidPassword = await bcrypt.compare(password, user.password_hash)
  
  if (!isValidPassword) {
    return null
  }
  
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
  
  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    token,
  }
}

// JWTトークン検証
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string }
    return decoded
  } catch (error) {
    return null
  }
}

// ユーザー取得
export async function getUserById(userId: string): Promise<User | null> {
  const result = await db.query(
    'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  )
  
  return result.rows.length > 0 ? result.rows[0] : null
}

// ユーザー更新
export async function updateUser(userId: string, updates: Partial<{ email: string }>): Promise<User | null> {
  const fields = Object.keys(updates)
  const values = Object.values(updates)
  
  if (fields.length === 0) {
    return getUserById(userId)
  }
  
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
  const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING id, email, created_at, updated_at`
  
  const result = await db.query(query, [userId, ...values])
  
  return result.rows.length > 0 ? result.rows[0] : null
} 