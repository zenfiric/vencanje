const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');
const zlib = require('zlib');

const PORT = process.env.PORT || 7000;
const DIR  = __dirname;
const CSV  = path.join(DIR, 'data', 'submissions.csv');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.woff2':'font/woff2',
};

function serveFile(res, filePath, req) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
    if (acceptsGzip && ['.html', '.css', '.js'].includes(ext)) {
      zlib.gzip(data, (err, compressed) => {
        if (err) { res.writeHead(200, {'Content-Type': mime}); res.end(data); return; }
        res.writeHead(200, {'Content-Type': mime, 'Content-Encoding': 'gzip'});
        res.end(compressed);
      });
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    }
  });
}

function handleRsvp(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch { data = {}; }

    const name     = String(data.name     || '').trim().replace(/[\r\n]/g, ' ');
    const attending= String(data.attending|| '').trim();
    const guests   = Math.max(0, parseInt(data.guests) || 0);
    const dietary  = String(data.dietary  || '').trim().replace(/[\r\n]/g, ' ');
    const message  = String(data.message  || '').trim().replace(/[\r\n]/g, ' ');
    const lang     = ['sr','el'].includes(data.lang) ? data.lang : 'sr';
    const ts       = new Date().toISOString().replace('T',' ').slice(0,19);
    const ip       = req.socket.remoteAddress || '';

    if (!name) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:false, error:'Name required'}));
      return;
    }

    const dataDir = path.join(DIR, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const newFile = !fs.existsSync(CSV);
    const csvLine = [ts, name, attending, guests, dietary, message, lang, ip]
      .map(v => `"${String(v).replace(/"/g,'""')}"`).join(',') + '\n';

    if (newFile) {
      fs.writeFileSync(CSV, '"Timestamp","Ime","Prisustvo","Br. gostiju","Dijeta/Alergije","Poruka","Jezik","IP"\n');
    }
    fs.appendFileSync(CSV, csvLine);

    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:true}));
  });
}

function handleSubmissions(req, res) {
  // Basic auth
  const auth = req.headers['authorization'] || '';
  const b64  = auth.replace('Basic ', '');
  const cred = Buffer.from(b64, 'base64').toString();
  if (cred !== 'admin:vencanje2025') {
    res.writeHead(401, {'WWW-Authenticate':'Basic realm="RSVP"'});
    res.end('Unauthorized');
    return;
  }

  if (!fs.existsSync(CSV)) {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    res.end('<p style="font-family:Georgia;padding:2rem;color:#7a6a58;font-style:italic">Нема потврда.</p>');
    return;
  }

  const raw  = fs.readFileSync(CSV, 'utf8');
  const lines= raw.trim().split('\n').filter(Boolean);
  const parse= l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g,'').replace(/""/g,'"'));
  const header= parse(lines[0]);
  const rows  = lines.slice(1).reverse().map(parse);

  let attending=0, guests=0;
  rows.forEach(r => {
    const a = (r[2]||'').toLowerCase();
    if (a.includes('да') || a.includes('ναι')) { attending++; guests += parseInt(r[3])||0; }
  });

  const th = header.map(h => `<th>${h}</th>`).join('');
  const trs= rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');

  const htmlOut = `<!DOCTYPE html>
<html lang="sr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RSVP – Милан & Нина</title>
<style>
  body{font-family:Georgia,serif;background:#faf7f2;color:#1c1208;margin:0;padding:2rem}
  h1{font-weight:300;font-style:italic;color:#4a5c33;font-size:2rem;margin-bottom:.25rem}
  .stats{display:flex;gap:1.5rem;margin:1.5rem 0 2rem;flex-wrap:wrap}
  .stat{background:white;border:1px solid #ddd0b8;padding:1rem 1.5rem;min-width:100px}
  .sn{font-size:2rem;font-weight:300;color:#c19a6b}
  .sl{font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:#7a6a58}
  table{width:100%;border-collapse:collapse;background:white;font-size:.85rem}
  th{background:#2e3b1f;color:#d4b896;padding:.65rem .9rem;text-align:left;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;font-weight:400}
  td{padding:.6rem .9rem;border-bottom:1px solid #f0eae0;vertical-align:top}
  tr:hover td{background:#fdfaf7}
  a.btn{display:inline-block;margin-top:1.5rem;padding:.6rem 1.5rem;background:#2e3b1f;color:#d4b896;text-decoration:none;font-size:.75rem;letter-spacing:.2em}
</style></head><body>
<h1>Милан &amp; Нина — RSVP</h1>
<p style="color:#7a6a58;font-size:.85rem">Укупно одговора: ${rows.length}</p>
<div class="stats">
  <div class="stat"><div class="sn">${rows.length}</div><div class="sl">Одговора</div></div>
  <div class="stat"><div class="sn">${attending}</div><div class="sl">Долазе</div></div>
  <div class="stat"><div class="sn">${guests}</div><div class="sl">Гостију</div></div>
</div>
${rows.length ? `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>` : '<p style="font-style:italic;color:#7a6a58">Нема потврда.</p>'}
<a class="btn" href="/data/submissions.csv">↓ Скини CSV</a>
</body></html>`;
  const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
  if (acceptsGzip) {
    zlib.gzip(Buffer.from(htmlOut, 'utf8'), (err, compressed) => {
      if (err) {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        res.end(htmlOut);
        return;
      }
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Content-Encoding':'gzip'});
      res.end(compressed);
    });
  } else {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    res.end(htmlOut);
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  if (req.method === 'POST' && pathname === '/rsvp.php') {
    handleRsvp(req, res); return;
  }
  if (req.method === 'GET' && pathname === '/submissions') {
    handleSubmissions(req, res); return;
  }
  if (req.method === 'GET' && pathname === '/data/submissions.csv') {
    const auth = req.headers['authorization'] || '';
    const b64  = auth.replace('Basic ', '');
    const cred = Buffer.from(b64, 'base64').toString();
    if (cred !== 'admin:vencanje2025') {
      res.writeHead(401, {'WWW-Authenticate':'Basic realm="RSVP"'});
      res.end('Unauthorized'); return;
    }
    if (!fs.existsSync(CSV)) { res.writeHead(404); res.end('No data'); return; }
    res.writeHead(200, {'Content-Type':'text/csv','Content-Disposition':'attachment; filename="submissions.csv"'});
    res.end(fs.readFileSync(CSV)); return;
  }

  // Static files
  let filePath = path.join(DIR, pathname === '/' ? 'index.html' : pathname);
  // security: prevent path traversal
  if (!filePath.startsWith(DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  serveFile(res, filePath, req);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Wedding invitation running at http://0.0.0.0:${PORT}`);
  console.log(`Submissions viewer: http://0.0.0.0:${PORT}/submissions  (admin:vencanje2025)`);
});
