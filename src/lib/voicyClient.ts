import { chromium, Browser, Page } from 'playwright'

export interface VoicyUploadOptions {
  email: string
  password: string
  title: string
  description: string
  hashtags: string
  audioFiles: string[]
  reservationDate: string // 'YYYY/MM/DD'
  reservationTime: string // 'HH:mm'
  browserlessWSEndpoint?: string
}

export async function uploadToVoicy(options: VoicyUploadOptions): Promise<{ success: boolean; message: string }> {
  let browser: Browser | null = null
  try {
    browser = await chromium.connectOverCDP(options.browserlessWSEndpoint || 'ws://localhost:3000')
    const page = await browser.newPage()
    await page.goto('https://va-cms.admin.voicy.jp/login')
    await page.fill('input[placeholder="メールアドレスを入力してください"]', options.email)
    await page.fill('input[placeholder="パスワードを入力してください"]', options.password)
    await page.click('#login-button')
    await page.waitForLoadState('networkidle')
    // 新規作成
    await page.getByRole('button', { name: '新規作成' }).click()
    await page.getByText('新規放送作成').click()
    await page.waitForSelector('input[placeholder="放送タイトルを入力"]')
    await page.fill('input[placeholder="放送タイトルを入力"]', options.title)
    await page.fill('textarea[placeholder^="放送内容の紹介"]', options.description)
    await page.fill('input[placeholder="ハッシュタグを入力"]', options.hashtags)
    // 音声ファイルアップロード
    for (let i = 0; i < options.audioFiles.length; i++) {
      if (i > 0) {
        await page.getByRole('button', { name: 'チャプターを追加' }).click()
      }
      const uploadBtn = await page.getByRole('button', { name: '音声アップロード' }).nth(i)
      await uploadBtn.click()
      const popupBtn = await page.getByRole('button', { name: '音声ファイルをアップロードする' })
      await popupBtn.waitFor()
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        popupBtn.click()
      ])
      await fileChooser.setFiles(options.audioFiles[i])
      await popupBtn.waitFor({ state: 'hidden' })
    }
    // 予約投稿
    await page.getByRole('button', { name: '日時を指定して予約' }).click()
    const dateInput = await page.$('input[placeholder="年月日を入力"]') || await page.$('input[placeholder="YYYY/MM/DD"]')
    if (dateInput) {
      await dateInput.fill(options.reservationDate)
      await dateInput.dispatchEvent('blur')
    }
    const [hours, minutes] = options.reservationTime.split(':')
    const hoursInput = await page.$('input[aria-label="hours"]')
    const minutesInput = await page.$('input[aria-label="minutes"]')
    if (hoursInput && minutesInput) {
      await hoursInput.fill(hours)
      await minutesInput.fill(minutes)
    }
    await page.locator('#reserve-playlist-button').click()
    // 完了メッセージ待ち
    await page.waitForSelector(':text("設定が完了しました。")', { timeout: 20000 })
    return { success: true, message: 'Voicy予約投稿成功' }
  } catch (e: any) {
    return { success: false, message: e.message || 'Voicy自動化エラー' }
  } finally {
    if (browser) await browser.close()
  }
} 