(() => {
  // ── Constants ──────────────────────────────────────────────
  const MIN_SELECTION_LENGTH = 2;
  const MAX_SELECTION_LENGTH = 10000;
  const CONTEXT_CHARS = 500;

  // ── Shadow DOM host ────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'doc-explainer-host';
  host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

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

    .popover {
      position: fixed;
      display: none;
      flex-direction: column;
      width: 400px;
      max-height: 420px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #1a1a1a;
      z-index: 2147483647;
      overflow: hidden;
    }
    .popover.visible {
      display: flex;
    }

    .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #f7f8fa;
      border-bottom: 1px solid #eee;
      cursor: move;
      user-select: none;
    }
    .popover-header-text {
      font-size: 12px;
      color: #888;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320px;
    }
    .popover-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #999;
      cursor: pointer;
      padding: 0 0 0 8px;
      line-height: 1;
    }
    .popover-close:hover { color: #333; }

    .popover-body {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      line-height: 1.65;
      word-break: break-word;
    }
    .popover-body p { margin-bottom: 8px; }
    .popover-body p:last-child { margin-bottom: 0; }
    .popover-body code {
      background: #f0f0f0;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
    }
    .popover-body pre {
      background: #f5f5f5;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 8px;
    }
    .popover-body pre code {
      background: none;
      padding: 0;
    }
    .popover-body ul, .popover-body ol {
      padding-left: 20px;
      margin-bottom: 8px;
    }
    .popover-body li { margin-bottom: 4px; }
    .popover-body strong { font-weight: 600; }
    .popover-body h1, .popover-body h2, .popover-body h3 {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .popover-body h1 { font-size: 16px; }
    .popover-body h2 { font-size: 15px; }
    .popover-body h3 { font-size: 14px; }

    .popover-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px 14px;
      border-top: 1px solid #eee;
      background: #f7f8fa;
    }
    .popover-footer button {
      padding: 4px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fff;
      font-size: 12px;
      cursor: pointer;
      color: #333;
    }
    .popover-footer button:hover {
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
  shadow.appendChild(style);

  // ── Trigger button ─────────────────────────────────────────
  const triggerBtn = document.createElement('button');
  triggerBtn.className = 'trigger-btn';
  triggerBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  triggerBtn.title = 'Explain selection';
  shadow.appendChild(triggerBtn);

  // ── Popover ────────────────────────────────────────────────
  const popover = document.createElement('div');
  popover.className = 'popover';
  popover.innerHTML = `
    <div class="popover-header">
      <span class="popover-header-text"></span>
      <button class="popover-close">&times;</button>
    </div>
    <div class="popover-body"></div>
    <div class="popover-footer">
      <button class="copy-btn">Copy</button>
    </div>
  `;
  shadow.appendChild(popover);

  const headerText = popover.querySelector('.popover-header-text');
  const body = popover.querySelector('.popover-body');
  const closeBtn = popover.querySelector('.popover-close');
  const copyBtn = popover.querySelector('.copy-btn');
  const header = popover.querySelector('.popover-header');

  // ── State ──────────────────────────────────────────────────
  let rawResponse = '';

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

  function showPopover(rect) {
    let x = rect.right + 10;
    let y = rect.top;

    // Keep within viewport
    if (x + 400 > window.innerWidth) x = Math.max(8, rect.left - 410);
    if (y + 420 > window.innerHeight) y = Math.max(8, window.innerHeight - 430);

    popover.style.left = `${x}px`;
    popover.style.top = `${y}px`;
    popover.classList.add('visible');
  }

  function hidePopover() {
    popover.classList.remove('visible');
    body.innerHTML = '';
    rawResponse = '';
  }

  // ── Markdown rendering (lightweight) ───────────────────────
  function renderMarkdown(md) {
    let html = md
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Unordered lists
      .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Paragraphs: split by double newlines
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
    showPopover(info.rect);
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

  // ── Drag to move popover ───────────────────────────────────
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragOffset.x = e.clientX - popover.offsetLeft;
    dragOffset.y = e.clientY - popover.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    popover.style.left = `${e.clientX - dragOffset.x}px`;
    popover.style.top = `${e.clientY - dragOffset.y}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // ── Event listeners ────────────────────────────────────────
  document.addEventListener('mouseup', (e) => {
    // Ignore clicks inside our UI
    if (host.contains(e.target)) return;

    setTimeout(() => {
      const info = getSelectionInfo();
      if (info) {
        showTrigger(info.rect);
      } else {
        hideTrigger();
      }
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    // Click outside popover → close
    if (!host.contains(e.target) && popover.classList.contains('visible')) {
      hidePopover();
    }
    // Click outside trigger → hide
    if (!host.contains(e.target)) {
      hideTrigger();
    }
  });

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const info = getSelectionInfo();
    if (info) {
      requestExplanation(info);
    }
  });

  closeBtn.addEventListener('click', () => hidePopover());

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
