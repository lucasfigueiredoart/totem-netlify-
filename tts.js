const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: ''
  };

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const EL_KEY   = 'sk_6121eae610392324270022148969d069fc8f318d610e72d6';
  const EL_VOICE = 'uN7bwBTrJ4H2a9hhd4LC';

  let text;
  try { text = JSON.parse(event.body || '{}').text; } catch(e) { return { statusCode: 400, body: 'Bad JSON' }; }
  if (!text) return { statusCode: 400, body: 'Missing text' };

  // Limitar texto para reduzir latência
  text = text.slice(0, 300);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': EL_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!r.ok) {
      const errText = await r.text();
      return { statusCode: r.status, body: 'EL error: ' + errText };
    }

    const buf = await r.buffer();
    const b64 = buf.toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: b64,
      isBase64Encoded: true
    };
  } catch(e) {
    clearTimeout(timeout);
    return { statusCode: 500, body: 'Fetch error: ' + e.message };
  }
};
