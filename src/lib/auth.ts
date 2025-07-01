import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { db } from './database'

export interface User {
  id: string
  email: string
  created_at: Date
  updated_at: Date
}

export interface AuthUser extends User {
  password_hash: string
}

// UUID生成（SQLite用）
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// JWT_SECRETの取得（開発環境ではデフォルト値を使用）
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-key-for-development-only'
}

// ユーザー登録
export async function registerUser(email: string, password: string): Promise<User> {
  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      console.log('Registering user in PostgreSQL:', email)
      const result = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at, updated_at',
        [email, hashedPassword]
      )
      console.log('User registered successfully:', result.rows[0])
      return result.rows[0]
    } else {
      // SQLite
      console.log('Registering user in SQLite:', email)
      const sqliteDb = await db
      const userId = generateUUID()
      const now = new Date().toISOString()
      
      await sqliteDb.run(
        'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [userId, email, hashedPassword, now, now]
      )
      
      const user = {
        id: userId,
        email,
        created_at: new Date(now),
        updated_at: new Date(now)
      }
      console.log('User registered successfully:', user)
      return user
    }
  } catch (error) {
    console.error('Error in registerUser:', error)
    throw error
  }
}

// ユーザーログイン
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      console.log('Logging in user in PostgreSQL:', email)
      const result = await db.query(
        'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
        [email]
      )
      
      if (result.rows.length === 0) {
        console.log('User not found in PostgreSQL:', email)
        return null
      }
      
      const user = result.rows[0] as AuthUser
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        console.log('Invalid password for user:', email)
        return null
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: '7d' }
      )
      
      console.log('User logged in successfully:', email)
      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        token,
      }
    } else {
      // SQLite
      console.log('Logging in user in SQLite:', email)
      const sqliteDb = await db
      const result = await sqliteDb.get(
        'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
        [email]
      )
      
      if (!result) {
        console.log('User not found in SQLite:', email)
        return null
      }
      
      const user = result as AuthUser
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        console.log('Invalid password for user:', email)
        return null
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: '7d' }
      )
      
      console.log('User logged in successfully:', email)
      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
        },
        token,
      }
    }
  } catch (error) {
    console.error('Error in loginUser:', error)
    throw error
  }
}

// JWTトークン検証
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; email: string }
    return decoded
  } catch (error) {
    return null
  }
}

// NextRequestから認証情報を検証
export async function verifyAuth(request: NextRequest): Promise<User | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return null
    }

    const user = await getUserById(decoded.userId)
    return user
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

// ユーザー取得
export async function getUserById(userId: string): Promise<User | null> {
  if (process.env.NODE_ENV === 'production') {
    // PostgreSQL
    const result = await db.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  } else {
    // SQLite
    const sqliteDb = await db
    const result = await sqliteDb.get(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    )
    
    if (!result) {
      return null
    }
    
    return {
      id: result.id,
      email: result.email,
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at)
    }
  }
}

// ユーザー更新
export async function updateUser(userId: string, updates: Partial<{ email: string }>): Promise<User | null> {
  if (process.env.NODE_ENV === 'production') {
    // PostgreSQL
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    
    if (fields.length === 0) {
      return getUserById(userId)
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING id, email, created_at, updated_at`
    
    const result = await db.query(query, [userId, ...values])
    return result.rows.length > 0 ? result.rows[0] : null
  } else {
    // SQLite
    const sqliteDb = await db
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    
    if (fields.length === 0) {
      return getUserById(userId)
    }
    
    const setClause = fields.map((field, index) => `${field} = ?`).join(', ')
    const query = `UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`
    const now = new Date().toISOString()
    
    await sqliteDb.run(query, [...values, now, userId])
    
    return getUserById(userId)
  }
} 