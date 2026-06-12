// ══════════════════════════════════════════════════════════════
// 認証 (Google Sign-In + ドメイン制限)
//   - Google Identity Services でログイン
//   - tokeninfo API で id_token を検証
//   - hd claim と email ドメインを両方チェック
//   - 24時間セッションを localStorage に保存
// ══════════════════════════════════════════════════════════════
const AUTH_CONFIG = {
  CLIENT_ID: '166991317292-26kbuegm98qq4tslkn1d86bovg75l4pa.apps.googleusercontent.com',
  ALLOWED_DOMAIN: 'vacancorp.com',
  SESSION_DURATION_MS: 24 * 60 * 60 * 1000, // 24時間
  SESSION_KEY: 'gencho_auth_session_v1'
};

// ───────────────────────────────────────────────
// セッション確認
// ───────────────────────────────────────────────
function checkAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || !session.email || !session.expiresAt) return false;
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
      return false;
    }
    // ドメイン再チェック（保険）
    if (!session.email.toLowerCase().endsWith('@' + AUTH_CONFIG.ALLOWED_DOMAIN)) {
      localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ───────────────────────────────────────────────
// Google の tokeninfo API で id_token を検証
// ───────────────────────────────────────────────
async function verifyIdToken(idToken) {
  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('検証API応答エラー (' + res.status + ')');
    const data = await res.json();

    // 各種検証
    if (data.aud !== AUTH_CONFIG.CLIENT_ID) {
      throw new Error('Client ID不一致');
    }
    const validIss = ['https://accounts.google.com', 'accounts.google.com'];
    if (!validIss.includes(data.iss)) {
      throw new Error('発行者不正');
    }
    if (parseInt(data.exp, 10) * 1000 < Date.now()) {
      throw new Error('トークン期限切れ');
    }
    if (data.hd !== AUTH_CONFIG.ALLOWED_DOMAIN) {
      throw new Error('社外アカウントのためアクセスできません');
    }
    if (!data.email || !data.email.toLowerCase().endsWith('@' + AUTH_CONFIG.ALLOWED_DOMAIN)) {
      throw new Error('社外アカウントのためアクセスできません');
    }
    if (data.email_verified !== 'true' && data.email_verified !== true) {
      throw new Error('メール未検証アカウントです');
    }

    return { ok: true, email: data.email, name: data.name || '' };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ───────────────────────────────────────────────
// ログイン成功時のコールバック
// ───────────────────────────────────────────────
async function handleCredentialResponse(response) {
  const errorEl = document.getElementById('authError');
  const loadingEl = document.getElementById('authLoading');
  if (errorEl) errorEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'block';

  const result = await verifyIdToken(response.credential);

  if (loadingEl) loadingEl.style.display = 'none';

  if (!result.ok) {
    if (errorEl) {
      errorEl.textContent = '❌ ' + result.error;
      errorEl.style.display = 'block';
    }
    return;
  }

  // セッション保存
  const session = {
    email: result.email,
    name: result.name,
    expiresAt: Date.now() + AUTH_CONFIG.SESSION_DURATION_MS
  };
  localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));

  showApp();
}

// ───────────────────────────────────────────────
// アプリ表示・ゲート非表示
// ───────────────────────────────────────────────
function showApp() {
  const gate = document.getElementById('authGate');
  if (gate) gate.style.display = 'none';
}

// ───────────────────────────────────────────────
// 認証ゲート初期化（GIS読み込み完了後）
// ───────────────────────────────────────────────
function initAuthGate() {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    console.warn('GIS not yet loaded');
    return;
  }
  google.accounts.id.initialize({
    client_id: AUTH_CONFIG.CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: false
  });

  const btnEl = document.getElementById('gsi-button');
  if (btnEl) {
    google.accounts.id.renderButton(btnEl, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left'
    });
  }
}

// ───────────────────────────────────────────────
// 起動ロジック
// ───────────────────────────────────────────────
(function bootAuth() {
  const DEV_SKIP_AUTH = false; // ⚠️ ローカル確認用。push/デプロイ前に必ず false に戻す
  if (DEV_SKIP_AUTH) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showApp);
    } else {
      showApp();
    }
    return;
  }
  // 既存セッションがあればすぐにゲートを閉じる
  if (checkAuthSession()) {
    // DOM がまだの場合に備えて遅延実行も保険で用意
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showApp);
    } else {
      showApp();
    }
    return;
  }

  // 未ログイン: ゲートを表示し、GIS の読み込み完了を待つ
  const onReady = () => {
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'flex';

    // GIS の読み込みを待ってボタンをレンダリング
    const waitForGIS = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        initAuthGate();
      } else {
        setTimeout(waitForGIS, 50);
      }
    };
    waitForGIS();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
