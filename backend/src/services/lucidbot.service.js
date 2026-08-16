const BASE_URL = (process.env.LUCIDBOT_API_BASE_URL || 'https://panel.lucidbot.co/api/').replace(/\/+$/, '');

async function postBotField({ apiKey, botFieldId, value }) {
  if (!apiKey) throw new Error('Falta el token X-ACCESS-TOKEN de LucidBot');
  if (!botFieldId) throw new Error('Falta el bot_field_id');

  const url = `${BASE_URL}/accounts/bot_fields/${botFieldId}`;
  const form = new FormData();
  form.append('value', value);

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-ACCESS-TOKEN': apiKey },
    body: form
  });

  const text = await resp.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }

  if (!resp.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  return data;
}

module.exports = { postBotField };
