importScripts('providers.js');

// Handle explanation requests from content script
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'doc-explainer') return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'explain') return;

    const settings = await chrome.storage.sync.get([
      'provider', 'model', 'language', 'enabled',
      'apiKey_openai', 'apiKey_anthropic', 'apiKey_google',
    ]);

    if (settings.enabled === false) {
      port.postMessage({ type: 'error', error: 'Doc Explainer is disabled' });
      return;
    }

    const provider = settings.provider || 'openai';
    const apiKey = settings[`apiKey_${provider}`];

    if (!apiKey) {
      port.postMessage({ type: 'error', error: 'API Key not set. Click the extension icon to configure.' });
      return;
    }

    const model = settings.model || PROVIDERS[provider].defaultModel;
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

    const streamFn = {
      openai: streamOpenAI,
      anthropic: streamAnthropic,
      google: streamGoogle,
    }[provider];

    try {
      await streamFn(apiKey, model, systemPrompt, userMessage, (content) => {
        port.postMessage({ type: 'chunk', content });
      });
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
