document.addEventListener('DOMContentLoaded', async () => {
  const el = {
    provider: document.getElementById('provider'),
    apiKey: document.getElementById('apiKey'),
    model: document.getElementById('model'),
    language: document.getElementById('language'),
    enabled: document.getElementById('enabled'),
    status: document.getElementById('status'),
  };

  function populateModels(provider) {
    const models = PROVIDERS[provider].models;
    el.model.innerHTML = models
      .map(m => `<option value="${m.id}">${m.name}</option>`)
      .join('');
  }

  function updateApiKeyPlaceholder(provider) {
    el.apiKey.placeholder = PROVIDERS[provider].keyPlaceholder;
  }

  // Load saved settings
  const saved = await chrome.storage.sync.get([
    'provider', 'model', 'language', 'enabled',
    'apiKey_openai', 'apiKey_anthropic', 'apiKey_google',
  ]);

  const currentProvider = saved.provider || 'openai';
  el.provider.value = currentProvider;
  populateModels(currentProvider);
  updateApiKeyPlaceholder(currentProvider);

  if (saved[`apiKey_${currentProvider}`]) el.apiKey.value = saved[`apiKey_${currentProvider}`];
  if (saved.model) el.model.value = saved.model;
  if (saved.language) el.language.value = saved.language;
  el.enabled.checked = saved.enabled !== false;

  // Provider change → update models, API key, placeholder
  el.provider.addEventListener('change', async () => {
    const provider = el.provider.value;
    populateModels(provider);
    updateApiKeyPlaceholder(provider);

    const keys = await chrome.storage.sync.get([`apiKey_${provider}`]);
    el.apiKey.value = keys[`apiKey_${provider}`] || '';

    const defaultModel = PROVIDERS[provider].defaultModel;
    el.model.value = defaultModel;

    save('provider', provider);
    save('model', defaultModel);
  });

  el.apiKey.addEventListener('change', () => {
    save(`apiKey_${el.provider.value}`, el.apiKey.value.trim());
  });
  el.model.addEventListener('change', () => save('model', el.model.value));
  el.language.addEventListener('change', () => save('language', el.language.value));
  el.enabled.addEventListener('change', () => save('enabled', el.enabled.checked));

  function save(key, value) {
    chrome.storage.sync.set({ [key]: value });
    showStatus('Saved', 'success');
  }

  function showStatus(message, type) {
    el.status.textContent = message;
    el.status.className = `status ${type}`;
    setTimeout(() => {
      el.status.className = 'status hidden';
    }, 1500);
  }
});
