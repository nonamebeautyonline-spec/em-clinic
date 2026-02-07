import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
if (!TOKEN) { console.log('No token found'); process.exit(1); }

const menu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: '個人情報入力前',
  chatBarText: 'Noname Beauty',
  areas: [
    { bounds: { x: 1708, y: 92, width: 725, height: 712 }, action: { type: 'postback', data: JSON.stringify({ type: 'rich_menu_action', actions: [{ type: 'text_send', value: 'test' }] }) } },
    { bounds: { x: 0, y: 12, width: 1675, height: 824 }, action: { type: 'uri', uri: 'https://app.noname-beauty.jp/register', label: 'link' } },
    { bounds: { x: 71, y: 908, width: 717, height: 716 }, action: { type: 'postback', data: JSON.stringify({ type: 'noop' }) } },
    { bounds: { x: 896, y: 908, width: 733, height: 720 }, action: { type: 'postback', data: JSON.stringify({ type: 'noop' }) } },
    { bounds: { x: 1713, y: 916, width: 713, height: 716 }, action: { type: 'uri', uri: 'https://noname-beauty.jp', label: 'link' } },
  ]
};

console.log('Creating rich menu...');
const res = await fetch('https://api.line.me/v2/bot/richmenu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify(menu),
});
const text = await res.text();
console.log('Status:', res.status);
console.log('Body:', text);

if (res.ok) {
  const { richMenuId } = JSON.parse(text);
  console.log('\nRich Menu ID:', richMenuId);

  // Upload image
  const imageUrl = 'https://fzfkgemtaxsrocbucmza.supabase.co/storage/v1/object/public/line-images/media/menu_image/1770449050619_7473tj.png';
  console.log('\nDownloading image...');
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.log('Image download failed:', imgRes.status);
    process.exit(1);
  }
  const contentType = imgRes.headers.get('content-type') || 'image/png';
  const buffer = await imgRes.arrayBuffer();
  console.log('Image size:', buffer.byteLength, 'bytes, type:', contentType);

  console.log('Uploading image to LINE...');
  const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, Authorization: `Bearer ${TOKEN}` },
    body: buffer,
  });
  console.log('Upload status:', uploadRes.status);
  console.log('Upload body:', await uploadRes.text());

  if (uploadRes.ok) {
    // Set as default
    console.log('\nSetting as default rich menu...');
    const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    });
    console.log('Default status:', defaultRes.status);
    console.log('Default body:', await defaultRes.text());

    // Update DB
    const { createClient } = await import('@supabase/supabase-js');
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await s.from('rich_menus').update({ line_rich_menu_id: richMenuId, is_active: true }).eq('id', 2);
    if (error) console.log('DB update error:', error.message);
    else console.log('\nDB updated: line_rich_menu_id =', richMenuId, ', is_active = true');
  }
}
