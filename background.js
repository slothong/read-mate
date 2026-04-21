// Handle explanation requests from content script
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'doc-explainer') return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'explain') return;

    const settings = await chrome.storage.sync.get(['apiKey', 'model', 'language', 'enabled']);

    if (settings.enabled === false) {
      port.postMessage({ type: 'error', error: 'Doc Explainer is disabled' });
      return;
    }

    if (!settings.apiKey) {
      port.postMessage({ type: 'error', error: 'API Key not set. Click the extension icon to configure.' });
      return;
    }

    const model = settings.model || 'gpt-4o-mini';
    const language = settings.language || 'ko';

    const languageInstruction = {
      ko: 'Always respond in Korean.',
      en: 'Always respond in English.',
      auto: 'Respond in the same language as the selected text.',
    }[language];

    const systemPrompt = `You are a friendly assistant that explains text selected from web pages in the simplest possible way.

Rules:
- **Use easy, everyday words.** Avoid jargon. If you must use a technical term, immediately define it in plain language.
- **Consider the document context.** The user is reading a specific page — tailor your explanation to fit that page's topic and audience level.
- Explain like you're talking to a curious friend who is not an expert in this field.
- If it's a technical term, explain what it means, why it matters, and give a real-world analogy.
- If it's code, explain what it does step by step in plain language.
- If it's a long passage, summarize the key points simply.
- Keep explanations concise but easy to follow.
- Use markdown formatting for readability.
- ${languageInstruction}`;

    let userMessage = '';
    if (msg.pageTitle) {
      userMessage += `The user is reading a page titled: "${msg.pageTitle}"\n\n`;
    }
    if (msg.pageDescription) {
      userMessage += `Page description: "${msg.pageDescription}"\n\n`;
    }
    if (msg.context) {
      userMessage += `Surrounding text for context:\n"""${msg.context}"""\n\n`;
    }
    userMessage += `Selected text to explain:\n"""${msg.text}"""`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        port.postMessage({
          type: 'error',
          error: err.error?.message || `API error: ${response.status}`,
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            port.postMessage({ type: 'done' });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              port.postMessage({ type: 'chunk', content });
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      port.postMessage({ type: 'done' });
    } catch (err) {
      port.postMessage({ type: 'error', error: err.message || 'Network error' });
    }
  });
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'explain-selection') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'trigger-explain' });
    }
  }
});
