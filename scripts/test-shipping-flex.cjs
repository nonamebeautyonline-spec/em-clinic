// テスト送信用スクリプト（一時ファイル）
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: intake } = await sb
    .from('intake')
    .select('patient_id, line_id, patient_name')
    .eq('patient_id', '20251200128')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('patient:', intake?.patient_name, intake?.line_id ? 'UID OK' : 'NO UID');
  if (!intake || !intake.line_id) return;

  const PINK = '#ec4899';
  const PINK_DARK = '#be185d';
  const WHITE = '#ffffff';
  const GRAY = '#666666';
  const tn = '123456789012';
  const formatted = tn.slice(0,4)+'-'+tn.slice(4,8)+'-'+tn.slice(8,12);
  const trackingUrl = 'https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=' + tn;

  const flex = {
    type: 'flex',
    altText: '\u3010\u767A\u9001\u5B8C\u4E86\u3011\u8FFD\u8DE1\u756A\u53F7: ' + formatted + ' \u30E4\u30DE\u30C8\u904B\u8F38 \u30C1\u30EB\u30C9\u4FBF\u306B\u3066\u767A\u9001\u3057\u307E\u3057\u305F',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        contents: [{ type: 'text', text: '\u767A\u9001\u5B8C\u4E86\u306E\u304A\u77E5\u3089\u305B', weight: 'bold', size: 'lg', color: WHITE }],
        backgroundColor: PINK, paddingAll: '16px',
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '16px',
        contents: [
          {
            type: 'box', layout: 'vertical',
            contents: [
              {
                type: 'box', layout: 'horizontal', alignItems: 'flex-end',
                paddingStart: '12px', paddingEnd: '12px',
                contents: [
                  { type: 'text', text: '\u767A\u9001', size: 'xs', color: GRAY, flex: 1, align: 'start', gravity: 'bottom' },
                  { type: 'image', url: 'https://app.noname-beauty.jp/images/truck-delivery.png', size: 'full', aspectRatio: '3:2', aspectMode: 'fit', flex: 1 },
                  { type: 'text', text: '\u304A\u5C4A\u3051\u4E88\u5B9A', size: 'xs', color: GRAY, flex: 1, align: 'end', gravity: 'bottom', wrap: true },
                ],
              },
              { type: 'image', url: 'https://app.noname-beauty.jp/images/progress-bar.png', size: 'full', aspectRatio: '20:2', aspectMode: 'cover', margin: 'xs' },
              { type: 'text', text: '\uFF08\u30E4\u30DE\u30C8\u904B\u8F38 \u30C1\u30EB\u30C9\u4FBF\uFF09', size: 'xs', color: GRAY, margin: 'sm', align: 'center' },
            ],
            backgroundColor: '#fdf2f8', cornerRadius: '8px', paddingTop: '12px', paddingBottom: '12px', paddingStart: '0px', paddingEnd: '0px',
          },
          {
            type: 'box', layout: 'vertical', margin: 'lg',
            contents: [
              { type: 'text', text: '\u8FFD\u8DE1\u756A\u53F7', size: 'sm', color: GRAY, align: 'center' },
              { type: 'text', text: formatted, size: 'xl', weight: 'bold', margin: 'sm', color: PINK_DARK, align: 'center' },
            ],
          },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '\u767A\u9001\u304C\u958B\u59CB\u3055\u308C\u308B\u3068\u65E5\u6642\u6307\u5B9A\u304C\u53EF\u80FD\u3068\u306A\u308A\u307E\u3059\u3002', size: 'sm', color: GRAY, wrap: true, margin: 'md' },
          { type: 'text', text: '\u65E5\u6642\u6307\u5B9A\u3092\u5E0C\u671B\u3055\u308C\u308B\u5834\u5408\u306F\u30DC\u30BF\u30F3\u3088\u308A\u5909\u66F4\u3092\u3057\u3066\u304F\u3060\u3055\u3044\u3002', size: 'sm', color: GRAY, wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '\u304A\u5C4A\u3051\u5F8C\u3001\u30DE\u30F3\u30B8\u30E3\u30ED\u306F\u51B7\u8535\u4FDD\u7BA1\u3092\u3059\u308B\u3088\u3046\u306B\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002', size: 'sm', color: GRAY, wrap: true, margin: 'md' },
          { type: 'text', text: '\u51B7\u51CD\u4FDD\u5B58\u3092\u884C\u3046\u3068\u85AC\u6DB2\u304C\u51CD\u7D50\u3057\u305F\u308A\u52B9\u679C\u304C\u4E0B\u304C\u3063\u3066\u3057\u307E\u3044\u307E\u3059\u306E\u3067\u3054\u6CE8\u610F\u304F\u3060\u3055\u3044\u3002', size: 'sm', color: GRAY, wrap: true, margin: 'sm' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '16px',
        contents: [
          { type: 'button', style: 'primary', color: PINK, action: { type: 'uri', label: '\u914D\u9001\u72B6\u6CC1\u3092\u78BA\u8A8D', uri: trackingUrl } },
          { type: 'text', text: '\u30DE\u30A4\u30DA\u30FC\u30B8\u304B\u3089\u3082\u78BA\u8A8D\u304C\u53EF\u80FD\u3067\u3059', size: 'xs', color: GRAY, align: 'center', margin: 'sm' },
        ],
      },
    },
  };

  const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ to: intake.line_id, messages: [flex] }),
  });
  const body = await res.text();
  console.log('LINE push:', res.status, body);
})();
