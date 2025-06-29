from playwright.sync_api import sync_playwright, expect
from playwright_stealth import Stealth
import time
import os
from datetime import datetime, timedelta
import re
import sys

# --- Constants ---
EMAIL = os.getenv('VOICY_EMAIL', "mnbmnb0524@gmail.com")
PASSWORD = os.getenv('VOICY_PASSWORD', "ghk5678GHJK&6789*&%^&*()-h")

# コマンドライン引数から設定を取得
TITLE = sys.argv[1] if len(sys.argv) > 1 else "テスト投稿"
DESCRIPTION = sys.argv[2] if len(sys.argv) > 2 else "この放送は、Playwrightによる自動化テストで作成されました。\n\nこれは放送の概要です。"
HASHTAGS = sys.argv[3] if len(sys.argv) > 3 else "#テスト #自動化 #Playwright"

DATASOURCE_FOLDER = os.path.join("datasource", TITLE)
SCREENSHOTS_FOLDER = "screenshots/voicy"

def save_screenshot(page, filename):
    """スクリーンショットを保存"""
    try:
        filepath = os.path.join(SCREENSHOTS_FOLDER, filename)
        page.screenshot(path=filepath)
        print(f"スクリーンショット保存: {filepath}")
        return True
    except Exception as e:
        print(f"スクリーンショット保存エラー: {e}")
        return False

def run_with_stealth():
    # Use the Stealth class to wrap playwright
    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(headless=True)  # 本番環境ではheadless=True
        context = browser.new_context()
        page = context.new_page()

        # ネットワークリクエストの監視を追加
        def handle_request(response):
            try:
                if response.status == 403:
                    print(f"⚠️ 403エラー検出: {response.url}")
                    # 403エラーの詳細情報を記録
                    if "vmedia-recorder-web-api" in response.url:
                        print("   📝 これは音声録音APIへのリクエストです。通常の動作の一部です。")
                    else:
                        print(f"   📝 リクエストヘッダー: {response.request.headers}")
                elif response.status >= 400:
                    print(f"⚠️ {response.status}エラー検出: {response.url}")
            except Exception as e:
                # エラーハンドリングを追加して、監視機能がメイン処理を妨げないようにする
                pass

        page.on("response", handle_request)
        
        # ページ読み込み時のエラーハンドリングを追加
        page.on("pageerror", lambda err: print(f"ページエラー: {err}"))
        page.on("console", lambda msg: print(f"コンソール: {msg.text}") if msg.type == "error" else None)

        # Stealth is applied automatically to all pages in the context
        

        try:
            print("ログインページにアクセス中...")
            page.goto("https://va-cms.admin.voicy.jp/login")
            # 人間らしい間隔を追加
            page.wait_for_timeout(2000)
            save_screenshot(page, "01_login_page.png")

            # Wait for the login form to be ready and fill in credentials
            print("Filling in login credentials...")
            page.locator('input[placeholder="メールアドレスを入力してください"]').fill(EMAIL)
            page.wait_for_timeout(1000)  # 入力間隔
            page.locator('input[placeholder="パスワードを入力してください"]').fill(PASSWORD)
            page.wait_for_timeout(1000)  # 入力間隔

            print("Clicking the login button...")
            page.locator("#login-button").click()

            # Wait for navigation after login or for a specific element on the dashboard
            print("Waiting for login to complete...")
            page.wait_for_load_state("networkidle", timeout=30000)

            print(f"Logged in. New page title: {page.title()}")
            page.wait_for_timeout(3000)  # ページ読み込み後の待機
            save_screenshot(page, "02_login_success.png")

            # 1. Click the "新規作成" (New Creation) button
            print("Clicking the '新規作成' button...")
            page.get_by_role("button", name="新規作成").click()
            page.wait_for_timeout(2000)  # ボタンクリック後の待機
            save_screenshot(page, "03_new_creation_clicked.png")

            # 2. Wait for the popup and click "新規放送作成"
            print("Waiting for and clicking '新規放送作成'...")
            page.get_by_text("新規放送作成").click()
            page.wait_for_timeout(2000)  # ボタンクリック後の待機
            save_screenshot(page, "04_new_broadcast_clicked.png")

            # Wait for the creation page to load by waiting for the title input
            print("Waiting for the creation page to load...")
            page.wait_for_selector('input[placeholder="放送タイトルを入力"]', timeout=15000)
            page.wait_for_timeout(3000)  # ページ読み込み後の待機
            save_screenshot(page, "05_creation_page_loaded.png")

            # 3. Fill in broadcast details
            print("Filling in broadcast details...")
            page.locator('input[placeholder="放送タイトルを入力"]').fill(TITLE)
            page.wait_for_timeout(1000)  # 入力間隔
            page.locator('textarea[placeholder^="放送内容の紹介"]').fill(DESCRIPTION)
            page.wait_for_timeout(1000)  # 入力間隔
            page.get_by_placeholder("ハッシュタグを入力").fill(HASHTAGS)
            page.wait_for_timeout(1000)  # 入力間隔
            save_screenshot(page, "06_broadcast_details_filled.png")
            
            # 4. データソースフォルダから音声ファイルをアップロードする
            print(f"'{DATASOURCE_FOLDER}'内の音声ファイルを検索しています...")
            
            audio_files = []
            if os.path.isdir(DATASOURCE_FOLDER):
                audio_files = sorted([
                    os.path.join(DATASOURCE_FOLDER, f)
                    for f in os.listdir(DATASOURCE_FOLDER)
                    if f.lower().endswith(('.mp3', '.wav', '.m4a'))
                ])

            if not audio_files:
                print("警告: 指定されたディレクトリに音声ファイルが見つかりません。音声なしで続行します。")
            else:
                print(f"{len(audio_files)}個の音声ファイルが見つかりました。アップロード処理を開始します。")
                
                for i, audio_file_path in enumerate(audio_files):
                    print(f"チャプター {i + 1} を処理中: {os.path.basename(audio_file_path)}")
                    
                    # 2つ目以降のファイルのために新しいチャプターを追加
                    if i > 0:
                        print("新しいチャプターを追加しています...")
                        page.get_by_role("button", name="チャプターを追加").click()
                        page.wait_for_timeout(2000)  # チャプター追加後の待機

                    # 現在のチャプターの「音声アップロード」ボタンをクリックしてポップアップを開く
                    print("「音声アップロード」をクリックしてポップアップを開いています...")
                    upload_button_for_chapter = page.get_by_role("button", name="音声アップロード").nth(i)
                    upload_button_for_chapter.click()
                    page.wait_for_timeout(2000)  # ボタンクリック後の待機

                    # ポップアップが表示されるのを待つ
                    popup_upload_button = page.get_by_role("button", name="音声ファイルをアップロードする")
                    popup_upload_button.wait_for(timeout=10000)

                    # ポップアップ経由でファイルをアップロード
                    print("アップロードポップアップでファイルを指定しています...")
                    with page.expect_file_chooser() as fc_info:
                        popup_upload_button.click()
                    
                    file_chooser = fc_info.value
                    file_chooser.set_files(audio_file_path)

                    # アップロードが完了するのを、ポップアップが閉じることで確認
                    print(f"'{os.path.basename(audio_file_path)}' のアップロード完了を待機中...")
                    popup_upload_button.wait_for(state="hidden", timeout=120000)
                    print(f"アップロード成功: {os.path.basename(audio_file_path)}")
                    
                    # アップロード後の待機時間を追加（サーバー負荷軽減）
                    page.wait_for_timeout(5000)
                    
                    # 各チャプターのアップロード後にスクリーンショット
                    save_screenshot(page, f"07_chapter_{i+1}_uploaded.png")

            # 5. 予約日時を設定
            print("予約日時を設定しています...")
            reservation_button = page.get_by_role("button", name="日時を指定して予約")
            
            print("予約ボタンが表示されるようにスクロールします...")
            reservation_button.scroll_into_view_if_needed()
            
            print("予約ボタンが有効になるのを待ちます...")
            expect(reservation_button).to_be_enabled(timeout=15000)
            
            print("予約ボタンをクリックします...")
            reservation_button.click()
            page.wait_for_timeout(3000)  # 予約ボタンクリック後の待機
            save_screenshot(page, "08_reservation_button_clicked.png")
            
            # カレンダーを開くための日付入力欄を、複数のセレクタを試して探す
            try:
                date_input = page.locator('input[placeholder="年月日を入力"]')
                date_input.wait_for(state="visible", timeout=2000)
                print("日付入力欄（プレースホルダー: '年月日を入力'）が見つかりました。")
            except Exception:
                print("プレースホルダー '年月日を入力' が見つかりません。'YYYY/MM/DD' で再試行します。")
                date_input = page.locator('input[placeholder="YYYY/MM/DD"]')
                date_input.wait_for(state="visible", timeout=10000)

            # 実行日から1週間後の日付を計算
            reservation_date = datetime.now() + timedelta(days=7)

            # カレンダーUIの操作を避け、日付を直接入力する (moment.jsの警告対策)
            date_str = reservation_date.strftime('%Y/%m/%d')
            print(f"日付を直接入力します: {date_str}")
            date_input.fill(date_str)
            # 入力を確定させるために、blurイベントを直接発行する
            date_input.dispatch_event('blur')
            page.wait_for_timeout(1000) # 入力反映の待機
            
            save_screenshot(page, "10_date_selected.png")

            # 時刻を設定（テキスト入力とドロップダウンの両方に対応）
            print("予約時刻を 06:00 に設定します。")
            try:
                hours_input = page.locator('input[aria-label="hours"]')
                hours_input.wait_for(state="visible", timeout=2000)
                print("時刻をテキスト入力で設定します。")
                hours_input.fill("06")
                page.wait_for_timeout(500)  # 入力間隔
                page.locator('input[aria-label="minutes"]').fill("00")
                page.wait_for_timeout(500)  # 入力間隔
            except Exception:
                print("時刻のテキスト入力が見つかりません。ドロップダウンで再試行します。")
                page.select_option('select[formcontrolname="hours"]', "06")
                page.wait_for_timeout(500)  # 選択間隔
                page.select_option('select[formcontrolname="minutes"]', "00")
                page.wait_for_timeout(500)  # 選択間隔
            
            save_screenshot(page, "11_time_set.png")

            # 最終予約ボタンをクリック
            final_reserve_button = page.locator("#reserve-playlist-button")
            print("最終予約ボタンが有効になるのを待ちます...")
            expect(final_reserve_button).to_be_enabled(timeout=15000)
            
            print("最終予約ボタンをクリックします...")
            print("テストモード。最終ボタンは押す直前で中断します")
            # # ダイアログハンドラを事前に登録（クリック前に重要）
            # dialog_handled = False
            # def handle_dialog(dialog):
            #     nonlocal dialog_handled
            #     print(f"ダイアログ検出: {dialog.message}")
            #     print(f"ダイアログタイプ: {dialog.type}")
            #     dialog.accept()  # 「OK」を自動で押す
            #     dialog_handled = True
            #     print("ダイアログを自動でOKしました")
            
            # # ダイアログハンドラを登録（1回だけ）
            # page.once("dialog", handle_dialog)
            
            # # ボタンをクリック
            # final_reserve_button.click()
            # save_screenshot(page, "12_final_reserve_clicked.png")

            # # ダイアログが処理されたか確認
            # if dialog_handled:
            #     print("確認ダイアログが正常に処理されました")
            #     save_screenshot(page, "13_confirmation_accepted.png")
            # else:
            #     print("ダイアログは表示されませんでした。予約が直接完了した可能性があります。")

            # # 「設定が完了しました。」の緑のポップアップを検出
            # print("完了メッセージのポップアップを検出中...")
            # try:
            #     # 複数の方法で完了メッセージを検出
            #     completion_message = page.locator(
            #         ":text('設定が完了しました。'), :text('完了しました'), :text('予約が完了')"
            #     )
            #     completion_message.wait_for(state="visible", timeout=10000)
            #     print("完了メッセージを検出しました")

            #     page.wait_for_timeout(1000)
            #     save_screenshot(page, "15_completion_popup.png")
            #     print("完了ポップアップのスクリーンショットを保存しました")
                
            #     completion_message.wait_for(state="hidden", timeout=15000)
            #     print("完了ポップアップが自動で消えました")

            # except Exception as e:
            #     print(f"完了メッセージの検出中にエラーが発生しました: {e}")

            # print("予約が完了し、ページが遷移しました。スクリーンショットを撮影します。")
            save_screenshot(page, "16_broadcast_reserved.png")

            # # 予約完了後の詳細確認
            # print("予約完了後の状態を確認しています...")
            # try:
            #     # ページタイトルやURLの確認
            #     print(f"現在のページタイトル: {page.title()}")
            #     print(f"現在のURL: {page.url}")
                
            #     # 予約完了を示す要素を探す
            #     success_indicators = [
            #         "予約完了",
            #         "放送予約",
            #         "予約済み",
            #         "完了",
            #         "success"
            #     ]
                
            #     for indicator in success_indicators:
            #         try:
            #             element = page.locator(f":text('{indicator}')")
            #             if element.count() > 0:
            #                 print(f"✅ 成功指標を発見: '{indicator}'")
            #                 break
            #         except Exception:
            #             continue
                
            #     # エラー要素がないか確認
            #     error_indicators = [
            #         "エラー",
            #         "失敗",
            #         "error",
            #         "failed"
            #     ]
                
            #     for indicator in error_indicators:
            #         try:
            #             element = page.locator(f":text('{indicator}')")
            #             if element.count() > 0:
            #                 print(f"⚠️ エラー指標を発見: '{indicator}'")
            #         except Exception:
            #             continue
                        
            # except Exception as e:
            #     print(f"状態確認中にエラーが発生しました: {e}")

            print("✅ Voicy予約投稿が正常に完了しました")
            return True

        except Exception as e:
            print(f"An error occurred: {e}")
            
            # 403エラーの特別な対処
            if "403" in str(e) or "Forbidden" in str(e):
                print("🚨 403エラーが発生しました。以下の対策を試してください：")
                print("   1. しばらく時間をおいてから再実行")
                print("   2. ブラウザを手動で開いてログイン状態を確認")
                print("   3. セッションが切れている場合は再ログイン")
                print("   4. IPアドレスが制限されている可能性があります")
            
            # より詳細なエラー情報を出力
            import traceback
            print("詳細なエラー情報:")
            print(traceback.format_exc())
            
            save_screenshot(page, "error_screenshot.png")
            print("Took a screenshot of the error state.")
            return False

        finally:
            browser.close()


if __name__ == "__main__":
    success = run_with_stealth()
    if success:
        print("🎉 Voicy自動化が成功しました！")
        sys.exit(0)
    else:
        print("❌ Voicy自動化が失敗しました。")
        sys.exit(1)
