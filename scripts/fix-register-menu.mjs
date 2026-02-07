import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
if (!TOKEN) { console.log('No token found'); process.exit(1); }

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. DBからリッチメニューid=2の正しいデータを取得
const { data: menuData, error: menuError } = await supabase
  .from('rich_menus')
  .select('*')
  .eq('id', 2)
  .single();

if (menuError || !menuData) {
  console.log('DB fetch error:', menuError?.message);
  process.exit(1);
}

console.log('=== DB Menu Data ===');
console.log('Name:', menuData.name);
console.log('Chat bar text:', menuData.chat_bar_text);
console.log('Selected:', menuData.selected);
console.log('Current LINE ID:', menuData.line_rich_menu_id);
console.log('Areas count:', menuData.areas?.length);
console.log('Areas:', JSON.stringify(menuData.areas, null, 2));

// 2. 旧メニュー削除
const oldMenuId = menuData.line_rich_menu_id;
if (oldMenuId) {
  console.log('\n=== Deleting old menu:', oldMenuId, '===');
  const delRes = await fetch(`https://api.line.me/v2/bot/richmenu/${oldMenuId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  console.log('Delete status:', delRes.status, await delRes.text());
}

// 3. mapActionToLine ロジック（lib/line-richmenu.ts と同等）
function mapActionToLine(action) {
  switch (action.type) {
    case 'uri':
      return {
        type: 'uri',
        uri: action.uri || 'https://line.me',
        label: action.label || 'リンク',
      };
    case 'tel':
      return {
        type: 'uri',
        uri: action.tel?.startsWith('tel:') ? action.tel : `tel:${action.tel || ''}`,
        label: action.label || '電話',
      };
    case 'message':
      return {
        type: 'message',
        text: action.text || 'メッセージ',
      };
    case 'form':
      return {
        type: 'uri',
        uri: `https://app.noname-beauty.jp/forms/${action.formSlug || ''}`,
        label: action.label || 'フォーム',
      };
    case 'action':
      return {
        type: 'postback',
        data: JSON.stringify({
          type: 'rich_menu_action',
          actions: action.actions || [],
          userMessage: action.userMessage || '',
        }),
        displayText: action.userMessage || undefined,
      };
    default:
      return {
        type: 'postback',
        data: JSON.stringify({ type: action.type || 'noop' }),
      };
  }
}

// 4. 正しいareasを構築
const sizeHeight = menuData.size_type === 'half' ? 843 : 1686;
const areas = (menuData.areas || []).map((area) => {
  const b = area.bounds;
  const x = Math.max(0, b.x);
  const y = Math.max(0, b.y);
  return {
    bounds: { x, y, width: b.width - (x - b.x), height: b.height - (y - b.y) },
    action: mapActionToLine(area.action),
  };
});

const menu = {
  size: { width: 2500, height: sizeHeight },
  selected: menuData.selected,
  name: menuData.name.slice(0, 300),
  chatBarText: (menuData.chat_bar_text || 'メニュー').slice(0, 14),
  areas,
};

console.log('\n=== LINE API Request Body ===');
console.log(JSON.stringify(menu, null, 2));

// 5. 新メニュー作成
console.log('\n=== Creating new rich menu ===');
const res = await fetch('https://api.line.me/v2/bot/richmenu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify(menu),
});
const text = await res.text();
console.log('Status:', res.status);
console.log('Body:', text);

if (!res.ok) {
  console.log('Failed to create menu');
  process.exit(1);
}

const { richMenuId } = JSON.parse(text);
console.log('New Rich Menu ID:', richMenuId);

// 6. 画像アップロード
const imageUrl = menuData.image_url;
console.log('\n=== Downloading image ===');
console.log('URL:', imageUrl);
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

if (!uploadRes.ok) {
  console.log('Image upload failed, cleaning up...');
  await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  process.exit(1);
}

// 7. デフォルトメニューに設定
console.log('\n=== Setting as default rich menu ===');
const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
});
console.log('Default status:', defaultRes.status);
console.log('Default body:', await defaultRes.text());

// 8. DB更新
console.log('\n=== Updating DB ===');
const { error: updateError } = await supabase
  .from('rich_menus')
  .update({ line_rich_menu_id: richMenuId, is_active: true })
  .eq('id', 2);

if (updateError) {
  console.log('DB update error:', updateError.message);
} else {
  console.log('DB updated: line_rich_menu_id =', richMenuId);
}

console.log('\n=== Done ===');
