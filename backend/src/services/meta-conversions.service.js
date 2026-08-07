const crypto = require('crypto');

function hash(data) {
  if (!data) return null;
  return crypto.createHash('sha256').update(data.toString().trim().toLowerCase()).digest('hex');
}

async function sendEvent(pixelId, accessToken, eventName, eventData, userData, options = {}) {
  if (!pixelId || !accessToken) return { ok: false, error: 'Meta Pixel ID o Access Token no configurados' };

  const eventId = `pizdo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: options.eventId || eventId,
      event_source_url: options.sourceUrl || '',
      action_source: 'website',
      user_data: {
        client_ip_address: options.clientIp || undefined,
        client_user_agent: options.userAgent || undefined,
        em: userData.email ? hash(userData.email) : undefined,
        ph: userData.phone ? hash(userData.phone) : undefined,
        fn: userData.firstName ? hash(userData.firstName) : undefined,
        ln: userData.lastName ? hash(userData.lastName) : undefined,
        ct: userData.city ? hash(userData.city) : undefined,
        st: userData.state ? hash(userData.state) : undefined,
        zp: userData.zip || undefined,
        country: userData.country ? hash(userData.country) : undefined,
        external_id: userData.externalId || undefined,
        fbc: userData.fbc || undefined,
        fbp: userData.fbp || undefined
      },
      custom_data: eventData
    }]
  };

  if (options.testEventCode) {
    payload.test_event_code = options.testEventCode;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      }
    );
    clearTimeout(timeout);

    const result = await response.json().catch(() => ({ error: response.statusText }));
    if (result.error) {
      console.error('[MetaCAPI] Error:', JSON.stringify(result.error));
    }
    return { ok: !result.error, result, eventId: payload.data[0].event_id };
  } catch (error) {
    console.error('[MetaCAPI] Error:', error.message);
    return { ok: false, error: error.message, eventId: payload.data[0].event_id };
  }
}

module.exports = { sendEvent, hash };
