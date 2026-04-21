(() => {
  // ── Constants ──────────────────────────────────────────────
  const MIN_SELECTION_LENGTH = 2;
  const MAX_SELECTION_LENGTH = 10000;
  const CONTEXT_CHARS = 500;
  const PANEL_WIDTH = 380;

  // ── Shadow DOM host for trigger button ────────────────────
  const btnHost = document.createElement('div');
  btnHost.id = 'doc-explainer-btn-host';
  btnHost.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;';
  document.body.appendChild(btnHost);

  const btnShadow = btnHost.attachShadow({ mode: 'closed' });

  const btnStyle = document.createElement('style');
  btnStyle.textContent = `
    .trigger-btn {
      position: fixed;
      display: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: #4a90d9;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.1s, background 0.15s;
      z-index: 2147483647;
    }
    .trigger-btn:hover {
      background: #357abd;
      transform: scale(1.08);
    }
    .trigger-btn.visible {
      display: flex;
    }
  `;
  btnShadow.appendChild(btnStyle);

  const triggerBtn = document.createElement('button');
  triggerBtn.className = 'trigger-btn';
  triggerBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  triggerBtn.title = 'Explain selection';
  btnShadow.appendChild(triggerBtn);

  // ── Side panel ────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'doc-explainer-panel';
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: -${PANEL_WIDTH}px;
    width: ${PANEL_WIDTH}px;
    height: 100vh;
    z-index: 2147483647;
    transition: right 0.25s ease;
  `;
  document.body.appendChild(panel);

  const panelShadow = panel.attachShadow({ mode: 'closed' });

  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .panel {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: #fff;
      border-left: 1px solid #ddd;
      box-shadow: -2px 0 12px rgba(0,0,0,0.08);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #1a1a1a;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #f7f8fa;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    }
    .panel-header-text {
      font-size: 12px;
      color: #888;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      margin-right: 8px;
    }
    .panel-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #999;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .panel-close:hover { color: #333; }

    .panel-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      line-height: 1.65;
      word-break: break-word;
    }
    .panel-body p { margin-bottom: 8px; }
    .panel-body p:last-child { margin-bottom: 0; }
    .panel-body code {
      background: #f0f0f0;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
    }
    .panel-body pre {
      background: #f5f5f5;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 8px;
    }
    .panel-body pre code {
      background: none;
      padding: 0;
    }
    .panel-body ul, .panel-body ol {
      padding-left: 20px;
      margin-bottom: 8px;
    }
    .panel-body li { margin-bottom: 4px; }
    .panel-body strong { font-weight: 600; }
    .panel-body h1, .panel-body h2, .panel-body h3 {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .panel-body h1 { font-size: 16px; }
    .panel-body h2 { font-size: 15px; }
    .panel-body h3 { font-size: 14px; }

    .panel-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px 16px;
      border-top: 1px solid #eee;
      background: #f7f8fa;
      flex-shrink: 0;
    }
    .panel-footer button {
      padding: 5px 14px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fff;
      font-size: 12px;
      cursor: pointer;
      color: #333;
    }
    .panel-footer button:hover {
      background: #f0f0f0;
    }

    .spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid #ddd;
      border-top-color: #4a90d9;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-msg {
      color: #c62828;
      font-size: 13px;
    }
    .retry-btn {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border: 1px solid #c62828;
      border-radius: 6px;
      background: #fff;
      color: #c62828;
      font-size: 12px;
      cursor: pointer;
    }
    .retry-btn:hover { background: #ffeaea; }
  `;
  panelShadow.appendChild(panelStyle);

  const panelEl = document.createElement('div');
  panelEl.className = 'panel';
  panelEl.innerHTML = `
    <div class="panel-header">
      <span class="panel-header-text"></span>
      <button class="panel-close">&times;</button>
    </div>
    <div class="panel-body"></div>
    <div class="panel-footer">
      <button class="copy-btn">Copy</button>
    </div>
  `;
  panelShadow.appendChild(panelEl);

  const headerText = panelEl.querySelector('.panel-header-text');
  const body = panelEl.querySelector('.panel-body');
  const closeBtn = panelEl.querySelector('.panel-close');
  const copyBtn = panelEl.querySelector('.copy-btn');

  // ── State ──────────────────────────────────────────────────
  let rawResponse = '';
  let panelOpen = false;

  // ── Panel open/close ──────────────────────────────────────
  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    panel.style.right = '0px';
    document.documentElement.style.marginRight = `${PANEL_WIDTH}px`;
    document.documentElement.style.transition = 'margin-right 0.25s ease';
  }

  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    panel.style.right = `-${PANEL_WIDTH}px`;
    document.documentElement.style.marginRight = '';
    body.innerHTML = '';
    rawResponse = '';
  }

  // ── Selection handling ─────────────────────────────────────
  function getSelectionInfo() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;

    const text = sel.toString().trim();
    if (text.length < MIN_SELECTION_LENGTH) return null;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Gather surrounding context
    let context = '';
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    if (el) {
      const fullText = el.innerText || el.textContent || '';
      const idx = fullText.indexOf(text.slice(0, 50));
      if (idx !== -1) {
        const start = Math.max(0, idx - CONTEXT_CHARS);
        const end = Math.min(fullText.length, idx + text.length + CONTEXT_CHARS);
        context = fullText.slice(start, end);
      }
    }

    return {
      text: text.length > MAX_SELECTION_LENGTH
        ? text.slice(0, MAX_SELECTION_LENGTH)
        : text,
      truncated: text.length > MAX_SELECTION_LENGTH,
      context,
      rect,
    };
  }

  function showTrigger(rect) {
    const x = Math.min(rect.right + 6, window.innerWidth - 40);
    const y = Math.max(rect.top - 6, 8);
    triggerBtn.style.left = `${x}px`;
    triggerBtn.style.top = `${y}px`;
    triggerBtn.classList.add('visible');
  }

  function hideTrigger() {
    triggerBtn.classList.remove('visible');
  }

  // ── Markdown rendering (lightweight) ───────────────────────
  function renderMarkdown(md) {
    let html = md
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    html = html
      .split(/\n{2,}/)
      .map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (/^<(h[1-3]|pre|ul|ol|li)/.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');

    return html;
  }

  // ── API call ───────────────────────────────────────────────
  function requestExplanation(info) {
    headerText.textContent = info.text.length > 60
      ? info.text.slice(0, 60) + '...'
      : info.text;

    body.innerHTML = '<div class="spinner"></div>';
    rawResponse = '';
    openPanel();
    hideTrigger();

    const port = chrome.runtime.connect({ name: 'doc-explainer' });

    port.postMessage({
      type: 'explain',
      text: info.text,
      context: info.context,
      pageTitle: document.title,
      pageDescription: document.querySelector('meta[name="description"]')?.content || '',
    });

    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'chunk':
          rawResponse += msg.content;
          body.innerHTML = renderMarkdown(rawResponse);
          body.scrollTop = body.scrollHeight;
          break;

        case 'done':
          if (!rawResponse) {
            body.innerHTML = '<p>No response received.</p>';
          }
          port.disconnect();
          break;

        case 'error':
          body.innerHTML = `
            <div class="error-msg">${escapeHtml(msg.error)}</div>
            <button class="retry-btn">Retry</button>
          `;
          body.querySelector('.retry-btn')?.addEventListener('click', () => {
            requestExplanation(info);
          });
          port.disconnect();
          break;
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Event listeners ────────────────────────────────────────
  document.addEventListener('mouseup', (e) => {
    if (btnHost.contains(e.target) || panel.contains(e.target)) return;

    setTimeout(() => {
      const info = getSelectionInfo();
      if (info) {
        showTrigger(info.rect);
      } else {
        hideTrigger();
      }
    }, 10);
  });

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const info = getSelectionInfo();
    if (info) {
      requestExplanation(info);
    }
  });

  closeBtn.addEventListener('click', () => closePanel());

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(rawResponse).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
  });

  // Keyboard shortcut from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'trigger-explain') {
      const info = getSelectionInfo();
      if (info) {
        requestExplanation(info);
      }
    }
  });
})();
