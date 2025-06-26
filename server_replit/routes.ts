import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUploadSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { youtubeService } from "./youtube-service";
import { spotifyService } from "./spotify-service";
import { AudioService } from "./audio-service";
import { voicyCredentialsRouter } from "./voicy-credentials";

const audioService = new AudioService();

// Configure multer for file uploads
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/mpeg',
      'audio/mp4', 'audio/x-m4a', 'audio/x-mpeg-3', 'audio/mpeg3'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video and audio files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize platform settings in database
  await initializePlatformSettings();
  
  // Handle favicon requests to prevent 404/403 errors
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
  });
  
  // YouTube settings management
  app.post("/api/youtube/settings", async (req, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ message: "Client ID and Client Secret are required" });
      }
      
      await storage.updatePlatformSettings('youtube', {
        settings: {
          clientId,
          clientSecret,
          refreshToken: '',
        },
        isActive: false,
      });
      
      res.json({ message: "YouTube credentials saved. Please authenticate to complete setup." });
    } catch (error: any) {
      console.error('YouTube settings error:', error);
      res.status(500).json({ message: "Failed to save YouTube settings" });
    }
  });

  app.get("/api/youtube/auth", async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings('youtube');
      if (!settings?.settings?.clientId || !settings?.settings?.clientSecret) {
        return res.status(400).json({ message: "YouTube credentials not configured. Please set them first." });
      }
      
      // Configure YouTube service with credentials
      youtubeService.setCredentials(settings.settings.clientId, settings.settings.clientSecret);
      
      const authUrl = youtubeService.generateAuthUrl();
      res.json({ authUrl });
    } catch (error: any) {
      console.error('YouTube auth error:', error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  app.get("/api/youtube/callback", async (req, res) => {
    console.log('YouTube callback received:', { query: req.query, headers: req.headers });
    
    try {
      const { code, error } = req.query;
      
      // Handle OAuth error from Google
      if (error) {
        console.error('OAuth error from Google:', error);
        return res.status(400).send(`
          <html>
            <body>
              <h1>認証エラー</h1>
              <p>Google認証でエラーが発生しました: ${error}</p>
              <script>
                window.opener && window.opener.postMessage('auth-error', '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }
      
      if (!code) {
        console.error('No authorization code received');
        return res.status(400).send(`
          <html>
            <body>
              <h1>認証エラー</h1>
              <p>認証コードが見つかりません。</p>
              <script>
                window.opener && window.opener.postMessage('auth-error', '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Get YouTube settings and configure the service
      const settings = await storage.getPlatformSettings('youtube');
      if (!settings?.settings?.clientId || !settings?.settings?.clientSecret) {
        return res.status(400).send(`
          <html>
            <body>
              <h1>設定エラー</h1>
              <p>YouTube認証情報が設定されていません。</p>
              <script>
                window.opener && window.opener.postMessage('auth-error', '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Configure YouTube service with credentials before handling callback
      youtubeService.setCredentials(settings.settings.clientId, settings.settings.clientSecret);
      
      await youtubeService.handleAuthCallback(code as string);
      
      res.send(`
        <html>
          <body>
            <h1>認証完了</h1>
            <p>YouTubeの認証が正常に完了しました。このウィンドウを閉じてください。</p>
            <script>
              window.opener && window.opener.postMessage('auth-success', '*');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('YouTube callback error:', error);
      res.status(500).send(`
        <html>
          <body>
            <h1>認証エラー</h1>
            <p>認証処理中にエラーが発生しました: ${error.message}</p>
            <script>
              window.opener && window.opener.postMessage('auth-error', '*');
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/youtube/disconnect", async (req, res) => {
    try {
      await storage.updatePlatformSettings('youtube', {
        settings: null,
        isActive: false,
      });
      res.json({ message: "YouTube disconnected successfully" });
    } catch (error: any) {
      console.error('YouTube disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect YouTube" });
    }
  });

  // Get all uploads
  app.get("/api/uploads", async (req, res) => {
    try {
      const uploads = await storage.getAllUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  // Get recent uploads
  app.get("/api/uploads/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const uploads = await storage.getRecentUploads(limit);
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent uploads" });
    }
  });

  // Get upload by ID
  app.get("/api/uploads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const upload = await storage.getUpload(id);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      res.json(upload);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upload" });
    }
  });

  // Create new upload
  app.post("/api/uploads", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const metadata = JSON.parse(req.body.metadata || '{}');
      console.log('Upload metadata received:', JSON.stringify(metadata, null, 2));
      console.log('Processed file from metadata:', metadata.processedFile);
      
      // Auto-disable YouTube for audio files (YouTube only supports video)
      const isVideoFile = req.file.mimetype.startsWith('video/');
      const updatedPlatforms = { ...metadata.platforms };
      
      if (!isVideoFile && updatedPlatforms.youtube?.enabled) {
        console.log(`Auto-disabling YouTube for audio file: ${req.file.originalname}`);
        updatedPlatforms.youtube.enabled = false;
        updatedPlatforms.youtube.disabledReason = 'YouTube only supports video files';
      }

      // Validate metadata
      const validatedData = insertUploadSchema.parse({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        processedFilePath: metadata.processedFile || null, // Store processed file path if provided
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        category: metadata.category,
        status: "pending",
        platforms: updatedPlatforms || {
          youtube: { enabled: isVideoFile, visibility: "public", status: "pending" },
          spotify: { enabled: false, status: "pending" },
          voicy: { enabled: false, status: "pending" }
        }
      });

      const upload = await storage.createUpload(validatedData);
      
      // Start processing in background
      processUpload(upload.id);
      
      res.status(201).json(upload);
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid upload data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create upload" });
    }
  });

  // Update upload
  app.patch("/api/uploads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const upload = await storage.updateUpload(id, updates);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      res.json(upload);
    } catch (error) {
      res.status(500).json({ message: "Failed to update upload" });
    }
  });

  // Delete upload
  app.delete("/api/uploads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const upload = await storage.getUpload(id);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      // Delete file from disk
      if (fs.existsSync(upload.filePath)) {
        fs.unlink(upload.filePath, () => {});
      }
      
      const deleted = await storage.deleteUpload(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      res.json({ message: "Upload deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete upload" });
    }
  });

  // Get upload statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getUploadStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Test Voicy connection endpoint
  app.get('/api/voicy/test', async (req, res) => {
    console.log('Testing Voicy connection...');
    
    try {
      const hasEmail = !!process.env.VOICY_EMAIL;
      const hasPassword = !!process.env.VOICY_PASSWORD;
      
      console.log('Voicy Environment Check:');
      console.log(`VOICY_EMAIL: ${hasEmail ? 'Set' : 'Missing'}`);
      console.log(`VOICY_PASSWORD: ${hasPassword ? 'Set' : 'Missing'}`);
      
      if (!hasEmail || !hasPassword) {
        return res.json({
          success: false,
          error: 'Voicy認証情報が設定されていません。環境変数 VOICY_EMAIL と VOICY_PASSWORD を確認してください。',
          details: {
            voicy_email_set: hasEmail,
            voicy_password_set: hasPassword,
            message: 'Secrets環境変数でVOICY_EMAILとVOICY_PASSWORDを設定してください'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Voicy認証情報は正常に設定されています（ドライランモード有効）',
        details: {
          voicy_email_set: true,
          voicy_password_set: true,
          dry_run_mode: true,
          automation_ready: true
        }
      });
      
    } catch (error: any) {
      console.error('Voicy test failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Voicy test failed'
      });
    }
  });

  // Get Voicy credentials (show actual values for form input)
  app.get('/api/voicy/credentials', async (req, res) => {
    try {
      const voicyEmail = process.env.VOICY_EMAIL;
      const voicyPassword = process.env.VOICY_PASSWORD;

      res.json({
        email: voicyEmail || '',
        password: voicyPassword || '',
        hasCredentials: !!(voicyEmail && voicyPassword)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get credentials" });
    }
  });

  // Update Voicy credentials (simulation for development)
  app.post('/api/voicy/credentials', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'メールアドレスとパスワードが必要です'
        });
      }

      // In development, this simulates updating environment variables
      // In production, you would update the actual secrets
      res.json({
        success: true,
        message: 'Voicy認証情報が更新されました（開発環境では実際の環境変数は変更されません）'
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update credentials" });
    }
  });

  // Get platform settings
  app.get("/api/platforms", async (req, res) => {
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform settings" });
    }
  });

  // Update platform settings
  app.patch("/api/platforms/:platform", async (req, res) => {
    try {
      const platform = req.params.platform;
      const updates = req.body;
      
      const settings = await storage.updatePlatformSettings(platform, updates);
      
      if (!settings) {
        return res.status(404).json({ message: "Platform settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update platform settings" });
    }
  });

  // Retry upload
  app.post("/api/uploads/:id/retry", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const upload = await storage.getUpload(id);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      // Reset status and retry processing
      await storage.updateUpload(id, { 
        status: "processing",
        updatedAt: new Date()
      });
      
      processUpload(id);
      
      res.json({ message: "Upload retry initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to retry upload" });
    }
  });

  // Audio processing capabilities
  app.get("/api/audio/capabilities", async (req, res) => {
    try {
      const capabilities = await audioService.getProcessingCapabilities();
      res.json(capabilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audio processing capabilities" });
    }
  });

  // Analyze audio file
  app.post("/api/audio/analyze", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const analysis = await audioService.analyzeAudio(req.file.path);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze audio file" });
    }
  });

  // Process audio with silence removal and phrase cutting
  app.post("/api/audio/process", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { title, targetPhrases, removeLeadingSilence, silenceThreshold, outputFormat } = req.body;
      
      const options = {
        removeLeadingSilence: removeLeadingSilence !== 'false',
        silenceThreshold: parseInt(silenceThreshold) || -50,
        targetPhrases: targetPhrases ? targetPhrases.split(',').map((p: string) => p.trim()) : [],
        outputFormat: outputFormat || 'preserve'
      };

      const result = await audioService.processAudio(req.file.path, title || 'Untitled', options);
      res.json(result);
    } catch (error) {
      console.error('Audio processing error:', error);
      res.status(500).json({ message: "Failed to process audio file" });
    }
  });

  // Download processed audio file
  app.get("/api/audio/download/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'processed_audio', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.download(filePath, filename);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // RSS Feed Management Routes
  app.get("/api/rss/feeds", async (req, res) => {
    try {
      const feeds = await storage.getAllRssFeeds();
      res.json(feeds);
    } catch (error) {
      res.status(500).json({ message: "Failed to get RSS feeds" });
    }
  });

  app.post("/api/rss/feeds", async (req, res) => {
    try {
      const { name, url } = req.body;
      const feed = await storage.createRssFeed({ name, url, isActive: true });
      res.status(201).json(feed);
    } catch (error) {
      res.status(500).json({ message: "Failed to create RSS feed" });
    }
  });

  app.get("/api/rss/episodes", async (req, res) => {
    try {
      const episodes = await storage.getDownloadedEpisodes();
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get episodes" });
    }
  });

  app.get("/api/rss/episodes/:id/download", async (req, res) => {
    try {
      const episodeId = parseInt(req.params.id);
      const episode = await storage.getRssEpisode(episodeId);
      
      if (!episode || !episode.localFilePath) {
        return res.status(404).json({ message: "Episode file not found" });
      }

      if (!fs.existsSync(episode.localFilePath)) {
        return res.status(404).json({ message: "Physical file not found" });
      }

      res.download(episode.localFilePath, `${episode.title}.${path.extname(episode.localFilePath)}`);
    } catch (error) {
      res.status(500).json({ message: "Failed to download episode" });
    }
  });

  // RSS Feed Generation and Access
  app.get("/rss/spotify-feed.xml", (req, res) => {
    try {
      const feedPath = path.join(process.cwd(), 'public', 'rss', 'spotify-feed.xml');
      
      if (!fs.existsSync(feedPath)) {
        return res.status(404).json({ message: "RSS feed not found" });
      }

      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.sendFile(feedPath);
    } catch (error) {
      res.status(500).json({ message: "Failed to serve RSS feed" });
    }
  });

  app.get("/api/rss/media/:id", async (req, res) => {
    try {
      const uploadId = parseInt(req.params.id);
      const upload = await storage.getUpload(uploadId);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      const filePath = upload.processedFilePath || upload.filePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader('Content-Type', upload.mimeType);
      res.setHeader('Content-Length', upload.fileSize.toString());
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      res.status(500).json({ message: "Failed to serve media file" });
    }
  });

  app.post("/api/rss/regenerate", async (req, res) => {
    try {
      const { rssGenerator } = await import('./rss-generator');
      await rssGenerator.regenerateFeed();
      
      res.json({ 
        success: true, 
        feedUrl: rssGenerator.getFeedUrl(),
        message: "RSS feed regenerated successfully" 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate RSS feed" });
    }
  });

  // Initialize platform settings and RSS monitoring
  initializePlatformSettings();
  initializeRssFeeds();

  const httpServer = createServer(app);
  return httpServer;
}

// Initialize platform settings in database
async function initializePlatformSettings() {
  try {
    const existingSettings = await storage.getAllPlatformSettings();
    
    if (existingSettings.length === 0) {
      const defaultPlatforms = [
        { platform: "youtube", settings: null, isActive: false },
        { platform: "spotify", settings: null, isActive: false },
        { platform: "voicy", settings: null, isActive: false },
      ];

      for (const platform of defaultPlatforms) {
        await storage.createPlatformSettings(platform);
      }
      console.log("Platform settings initialized in database");
    }
  } catch (error) {
    console.error("Failed to initialize platform settings:", error);
  }
}

// Initialize RSS feeds and start monitoring
async function initializeRssFeeds() {
  try {
    const { rssService } = await import('./rss-service');
    
    const existingFeeds = await storage.getAllRssFeeds();
    
    // Add Substack feed from environment variable if configured
    const substackUrl = process.env.SUBSTACK_RSS_URL;
    if (substackUrl) {
      const substackExists = existingFeeds.find(feed => feed.url === substackUrl);
      
      if (!substackExists) {
        await storage.createRssFeed({
          name: process.env.SUBSTACK_FEED_NAME || "External RSS Feed",
          url: substackUrl,
          isActive: true
        });
        console.log("External RSS feed added to monitoring");
      }
    }
    
    // Start RSS monitoring service
    rssService.startPeriodicCheck();
    console.log("RSS monitoring service started");
    
  } catch (error) {
    console.error("Failed to initialize RSS feeds:", error);
  }
}

// Background processing function
async function processUpload(uploadId: number) {
  try {
    const upload = await storage.getUpload(uploadId);
    if (!upload) return;

    console.log(`Processing upload ${uploadId}: ${upload.title}`);
    console.log(`Original file: ${upload.filePath}`);
    console.log(`Processed file: ${upload.processedFilePath || 'None'}`);
    console.log(`Will use: ${upload.processedFilePath || upload.filePath} for platform uploads`);

    // Update status to processing
    await storage.updateUpload(uploadId, { status: "processing" });

    const platforms = { ...upload.platforms };
    let hasErrors = false;

    // Process YouTube (only for video files)
    if (platforms?.youtube?.enabled) {
      // Double-check file type - YouTube only supports video files
      if (!upload.mimeType.startsWith('video/')) {
        console.log(`Skipping YouTube upload for audio file: ${upload.title} (${upload.mimeType})`);
        platforms.youtube.status = "skipped";
        platforms.youtube.error = "YouTube only supports video files";
        platforms.youtube.enabled = false;
      } else {
        try {
          console.log(`Starting YouTube upload for ${upload.title}`);
          
          const metadata = {
            title: upload.title,
            description: upload.description,
            tags: upload.tags,
            category: upload.category,
            visibility: platforms.youtube.visibility || 'public'
          };

          // Use processed file if available, otherwise use original file
          const fileToUpload = upload.processedFilePath || upload.filePath;
          console.log(`Using file for YouTube upload: ${fileToUpload} ${upload.processedFilePath ? '(processed)' : '(original)'}`);
          
          const result = await youtubeService.uploadVideo(fileToUpload, metadata);
          
          platforms.youtube.status = "completed";
          platforms.youtube.videoId = result.videoId;
          
          console.log(`YouTube upload completed: ${result.videoId} (Status: ${result.status})`);
        } catch (error: any) {
          console.error('YouTube upload failed:', error);
          platforms.youtube.status = "failed";
          platforms.youtube.error = error.message;
          hasErrors = true;
        }
      }
    }

    // Process Spotify (Browser automation)
    if (platforms?.spotify?.enabled) {
      try {
        console.log(`🎵 Starting Spotify upload for ${upload.title}`);
        console.log(`📁 File: ${upload.filePath} (${upload.mimeType})`);
        
        // Use processed file if available, otherwise use original file
        const fileToUpload = upload.processedFilePath || upload.filePath;
        console.log(`Using file for Spotify upload: ${fileToUpload} ${upload.processedFilePath ? '(processed)' : '(original)'}`);
        
        const result = await spotifyService.uploadToSpotify(fileToUpload, upload.title, upload.description || '');
        
        if (result.success) {
          platforms.spotify.status = "completed";
          platforms.spotify.details = result.details;
          console.log(`✅ Spotify upload completed: ${upload.title}`);
          if (result.details) {
            console.log(`📊 Upload details:`, JSON.stringify(result.details, null, 2));
          }
          
          // Update RSS feed B when Spotify upload succeeds
          try {
            const { rssGenerator } = await import('./rss-generator');
            await rssGenerator.addEpisode(uploadId);
            console.log(`📡 RSS feed updated for Spotify: ${upload.title}`);
          } catch (rssError) {
            console.error('Failed to update RSS feed:', rssError);
          }
        } else {
          platforms.spotify.status = "failed";
          platforms.spotify.error = result.error;
          platforms.spotify.details = result.details;
          console.log(`❌ Spotify upload failed: ${result.error}`);
          if (result.details) {
            console.log(`🔍 Error details:`, JSON.stringify(result.details, null, 2));
          }
          hasErrors = true;
        }
      } catch (error: any) {
        console.error('🚨 Spotify upload exception:', error);
        platforms.spotify.status = "failed";
        platforms.spotify.error = error.message;
        hasErrors = true;
      }
    }

    // Process Voicy
    if (platforms?.voicy?.enabled) {
      try {
        console.log(`🎙️ Starting Voicy upload for ${upload.title}`);
        
        // Use processed file if available, otherwise use original file
        const fileToUpload = upload.processedFilePath || upload.filePath;
        console.log(`Using file for Voicy upload: ${fileToUpload} ${upload.processedFilePath ? '(processed)' : '(original)'}`);
        
        const { voicyService } = await import('./voicy-service');
        
        const metadata = {
          title: upload.title,
          description: upload.description || '',
          hashtags: upload.tags || [],
          publishDate: new Date().toISOString().split('T')[0]
        };

        const result = await voicyService.uploadToVoicy(fileToUpload, metadata, false); // REAL AUTOMATION MODE
        
        if (result.success) {
          platforms.voicy.status = "completed";
          console.log(`✅ Voicy upload completed: ${upload.title}`);
          if (result.details) {
            console.log(`📊 Upload details:`, JSON.stringify(result.details, null, 2));
          }
        } else {
          platforms.voicy.status = "failed";
          platforms.voicy.error = result.error || "Voicy認証情報を確認してください。VOICY_EMAIL と VOICY_PASSWORD が正しく設定されているか環境変数を確認してください。";
          console.log(`❌ Voicy upload failed: ${result.error}`);
          hasErrors = true;
        }
      } catch (error: any) {
        console.error('🚨 Voicy upload exception:', error);
        platforms.voicy.status = "failed";
        platforms.voicy.error = error.message;
        hasErrors = true;
      }
    }

    // Update final status - ensure all platform properties exist
    const finalPlatforms = {
      youtube: platforms.youtube ? { 
        enabled: platforms.youtube.enabled, 
        visibility: platforms.youtube.visibility, 
        status: platforms.youtube.status,
        videoId: platforms.youtube.videoId,
        error: platforms.youtube.error
      } : { enabled: false, visibility: 'public', status: 'idle' },
      spotify: platforms.spotify ? {
        enabled: platforms.spotify.enabled,
        episodeNumber: platforms.spotify.episodeNumber,
        status: platforms.spotify.status,
        error: platforms.spotify.error
      } : { enabled: false, status: 'idle' },
      voicy: platforms.voicy ? {
        enabled: platforms.voicy.enabled,
        status: platforms.voicy.status,
        error: platforms.voicy.error
      } : { enabled: false, status: 'idle' }
    };

    const finalStatus = hasErrors ? "failed" : "completed";
    await storage.updateUpload(uploadId, {
      status: finalStatus,
      platforms: finalPlatforms,
      updatedAt: new Date()
    });

    console.log(`Upload ${uploadId} processing completed with status: ${finalStatus}`);

  } catch (error: any) {
    console.error(`Upload ${uploadId} processing failed:`, error);
    await storage.updateUpload(uploadId, {
      status: "failed",
      updatedAt: new Date()
    });
  }
}
