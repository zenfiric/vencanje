const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwCNUQk53L6KUcoBiK8Ax3nH9IjY8_xU245a-tyr2s4NW2R63HYmuBqzJYEOvMmBpIAEA/exec';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const clean = v => String(v || '').trim().replace(/[\r\n]/g, ' ');
  const name            = clean(data.name);
  const attending       = clean(data.attending);
  const partner         = clean(data.partner);
  const partner_name    = clean(data.partner_name);
  const children        = clean(data.children);
  const children_detail = clean(data.children_detail);
  const message         = clean(data.message);
  const lang            = ['sr', 'el', 'en'].includes(data.lang) ? data.lang : 'sr';
  const ts              = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const ip              = (event.headers['x-forwarded-for'] || '').split(',')[0].trim();

  if (!name) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Name required' }) };
  }

  const rows = [];
  if (attending === 'да') {
    rows.push({ ts, name, tip: 'Гост', message, lang, ip });
    if (partner === 'да') {
      const pName = partner_name || `${name} партнер`;
      rows.push({ ts, name: pName, tip: 'Партнер', message: '', lang, ip });
    }
    if (children === 'да' && children_detail) {
      children_detail.split(/[;\n]+/).map(s => s.trim()).filter(Boolean).forEach(child => {
        rows.push({ ts, name: child, tip: 'Дете', message: '', lang, ip });
      });
    }
  } else {
    rows.push({ ts, name, tip: 'Не долази', message, lang, ip });
  }

  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows.map(r => ({
        timestamp: r.ts, name: r.name, tip: r.tip, message: r.message, lang: r.lang, ip: r.ip,
      }))),
    });
  } catch (err) {
    console.error('Sheets sync failed:', err.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Could not save response' }) };
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }) };
};
