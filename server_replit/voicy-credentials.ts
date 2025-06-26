import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for credentials endpoint
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many credential update attempts' }
});

// Test endpoint for Voicy credentials
router.get('/test', (req, res) => {
  const voicyEmail = process.env.VOICY_EMAIL;
  const voicyPassword = process.env.VOICY_PASSWORD;

  if (voicyEmail && voicyPassword) {
    res.json({
      success: true,
      message: 'Voicy認証情報は正常に設定されています'
    });
  } else {
    res.json({
      success: false,
      message: 'Voicy認証情報が設定されていません'
    });
  }
});

// Get current credentials (masked for security)
router.get('/credentials', (req, res) => {
  const voicyEmail = process.env.VOICY_EMAIL;
  const voicyPassword = process.env.VOICY_PASSWORD;

  res.json({
    email: voicyEmail ? voicyEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '',
    password: voicyPassword ? '●'.repeat(voicyPassword.length) : '',
    hasCredentials: !!(voicyEmail && voicyPassword)
  });
});

// Update credentials endpoint (note: this only simulates update)
router.post('/credentials', credentialsLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'メールアドレスとパスワードが必要です'
    });
  }

  // In a real implementation, you would securely update environment variables
  // For now, we'll just return a success message
  res.json({
    success: true,
    message: '認証情報が更新されました。実際の更新には環境変数の設定が必要です。'
  });
});

export { router as voicyCredentialsRouter };