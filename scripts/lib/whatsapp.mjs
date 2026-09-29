// WhatsApp alert sender (Meta WhatsApp Cloud API, template messages).
//
// A business-initiated message outside the 24-hour customer-service window must use a template
// approved in WhatsApp Manager, so every alert is sent as one. The template expected here has
// two body variables: {{1}} = what happened, {{2}} = link to the dashboard section. Setup and the
// exact template text: tools/mx-macro/README.md ("WhatsApp alerts").
//
// Environment (repository secrets; when any of the first three is missing nothing is sent):
//   WHATSAPP_TOKEN            permanent System User access token with whatsapp_business_messaging
//   WHATSAPP_PHONE_NUMBER_ID  Phone number ID of the sending number (WhatsApp Manager > API setup)
//   WHATSAPP_TO               recipient(s), digits with country code, comma separated (e.g. 52155...)
//   WHATSAPP_TEMPLATE         template name, default fnam_alerta_material
//   WHATSAPP_TEMPLATE_LANG    template language code, default es_MX
//   WHATSAPP_API_VERSION      Graph API version, default v23.0
//
//   node scripts/lib/whatsapp.mjs --test      -> sends one test alert with the configured secrets
import { fileURLToPath } from 'node:url';

// Template variables may not contain newlines, tabs or more than four consecutive spaces.
const clean = (s, max) => {
  const t = String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 3) + '...' : t;
};

export function whatsappConfigured(env = process.env) {
  return Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_TO);
}

// Sends the template to every recipient. Never throws: returns { sent, failed, skipped }.
export async function sendWhatsAppAlert(what, link, env = process.env) {
  if (!whatsappConfigured(env)) return { sent: 0, failed: 0, skipped: 'WhatsApp secrets not set' };
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION || 'v23.0'}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const params = [clean(what, 700), clean(link, 250)];
  let sent = 0, failed = 0;
  for (const to of env.WHATSAPP_TO.split(',').map((s) => s.replace(/\D/g, '')).filter(Boolean)) {
    const payload = {
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name: env.WHATSAPP_TEMPLATE || 'fnam_alerta_material',
        language: { code: env.WHATSAPP_TEMPLATE_LANG || 'es_MX' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    };
    let done = false;
    for (let i = 1; i <= 3 && !done; i++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => ({ ok: false, status: e.message, text: async () => '' }));
      const text = await res.text().catch(() => '');
      // Recipient digits are masked in the log; only the last four are shown.
      const who = `…${to.slice(-4)}`;
      if (res.ok) { console.log(`whatsapp: sent to ${who} (${text.match(/"id":"(wamid[^"]+)"/)?.[1] || 'accepted'})`); done = true; }
      else {
        console.log(`whatsapp: send to ${who} failed (${res.status}) attempt ${i}: ${text.slice(0, 300)}`);
        // 4xx other than rate limiting is a configuration problem; retrying will not help.
        if (typeof res.status === 'number' && res.status >= 400 && res.status < 500 && res.status !== 429) break;
        await new Promise((r) => setTimeout(r, 3000 * i));
      }
    }
    if (done) sent++; else failed++;
  }
  return { sent, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--test')) {
  if (!whatsappConfigured()) { console.log('::error::WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TO must all be set'); process.exit(1); }
  const r = await sendWhatsAppAlert(`Mensaje de prueba, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, 'https://fnam.mx/mx/macro/');
  if (r.failed || !r.sent) { console.log('::error::WhatsApp test failed; the response above says why'); process.exit(1); }
}
