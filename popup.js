const SETTINGS_KEYS = ['apiKey', 'model', 'language', 'enabled'];

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    apiKey: document.getElementById('apiKey'),
    model: document.getElementById('model'),
    language: document.getElementById('language'),
    enabled: document.getElementById('enabled'),
    status: document.getElementById('status'),
  };

  // Load saved settings
  const saved = await chrome.storage.sync.get(SETTINGS_KEYS);
  if (saved.apiKey) elements.apiKey.value = saved.apiKey;
  if (saved.model) elements.model.value = saved.model;
  if (saved.language) elements.language.value = saved.language;
  elements.enabled.checked = saved.enabled !== false;

  // Auto-save on change
  function save(key, value) {
    chrome.storage.sync.set({ [key]: value });
    showStatus('Saved', 'success');
  }

  elements.apiKey.addEventListener('change', () => save('apiKey', elements.apiKey.value.trim()));
  elements.model.addEventListener('change', () => save('model', elements.model.value));
  elements.language.addEventListener('change', () => save('language', elements.language.value));
  elements.enabled.addEventListener('change', () => save('enabled', elements.enabled.checked));

  function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    setTimeout(() => {
      elements.status.className = 'status hidden';
    }, 1500);
  }
});
