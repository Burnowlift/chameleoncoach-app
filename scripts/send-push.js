// Envia push para todos os inscritos. Uso:
//   WEB_PUSH_PRIVATE_KEY="<chave do scripts/.vapid-private-key>" SUPABASE_SERVICE_ROLE_KEY="..." node scripts/send-push.js "Título" "Mensagem" [url]
const webPush = require("web-push");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
const publicKey =
  "BJ943XY8jXzFlzDp7B5NRZj3g34soDd7aCTFBojrpF1G6G0QbTDTXz6MD6jmwra0saPFl3T2umwcBTF-csJAZts";

if (!supabaseUrl || !serviceRoleKey || !privateKey) {
  console.error("Faltam env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEB_PUSH_PRIVATE_KEY");
  process.exit(1);
}

const title = process.argv[2];
const body = process.argv[3];
const url = process.argv[4] ?? "/";
if (!title) {
  console.error("Uso: node scripts/send-push.js \"Título\" \"Mensagem\" [url]");
  process.exit(1);
}

webPush.setVapidDetails(`mailto:coach@${new URL(supabaseUrl).hostname}`, publicKey, privateKey);

async function main() {
  const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=endpoint,keys_p256dh,keys_auth`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!res.ok) throw new Error(`GET subscriptions falhou: ${res.status}`);
  const subs = await res.json();
  console.log(`${subs.length} inscrições encontradas`);

  let sent = 0;
  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({ title, body, url }),
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        console.log(`Removendo inscrição expirada: ${sub.endpoint.slice(0, 60)}…`);
        await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        });
      } else {
        console.warn(`Erro ${e.statusCode} para ${sub.endpoint.slice(0, 60)}…`);
      }
    }
  }
  console.log(`Enviadas: ${sent}/${subs.length}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
