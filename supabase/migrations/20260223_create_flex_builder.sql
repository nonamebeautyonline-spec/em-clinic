-- Flex Messageビルダー用テーブル

-- message_templates に flex_content カラム追加
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS flex_content JSONB;

-- Flex プリセットテンプレート
CREATE TABLE IF NOT EXISTS flex_presets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',  -- button | confirm | image_text | carousel | receipt | general
  description TEXT,
  flex_json JSONB NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flex_presets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON flex_presets FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- プリセット初期データ（5種類）
INSERT INTO flex_presets (name, category, description, flex_json, sort_order) VALUES
(
  'ボタン型',
  'button',
  'テキストとボタンのシンプルなメッセージ',
  '{
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "タイトル", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "説明テキストをここに入力してください。", "size": "sm", "color": "#666666", "margin": "md", "wrap": true }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "詳細を見る", "uri": "https://example.com" } }
      ]
    }
  }',
  1
),
(
  '確認型',
  'confirm',
  'はい/いいえで答えるメッセージ',
  '{
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "確認メッセージ", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "この操作を実行してもよろしいですか？", "size": "sm", "color": "#666666", "margin": "md", "wrap": true }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "postback", "label": "はい", "data": "action=yes" } },
        { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "いいえ", "data": "action=no" } }
      ]
    }
  }',
  2
),
(
  '画像+テキスト型',
  'image_text',
  '画像付きの情報カード',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/06C755/FFFFFF?text=IMAGE",
      "size": "full",
      "aspectRatio": "2:1",
      "aspectMode": "cover"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "タイトル", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "画像付きのリッチなメッセージカードです。商品紹介やお知らせに最適です。", "size": "sm", "color": "#666666", "margin": "md", "wrap": true }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "詳細を見る", "uri": "https://example.com" } }
      ]
    }
  }',
  3
),
(
  'カルーセル型',
  'carousel',
  '横スクロールで複数カードを表示',
  '{
    "type": "carousel",
    "contents": [
      {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": "カード1", "weight": "bold", "size": "lg" },
            { "type": "text", "text": "1枚目の説明テキスト", "size": "sm", "color": "#666666", "margin": "md", "wrap": true }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "詳細", "uri": "https://example.com/1" } }
          ]
        }
      },
      {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": "カード2", "weight": "bold", "size": "lg" },
            { "type": "text", "text": "2枚目の説明テキスト", "size": "sm", "color": "#666666", "margin": "md", "wrap": true }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "詳細", "uri": "https://example.com/2" } }
          ]
        }
      }
    ]
  }',
  4
),
(
  'レシート型',
  'receipt',
  '注文確認や明細表示用',
  '{
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "注文確認", "weight": "bold", "size": "xl" },
        { "type": "separator", "margin": "md" },
        {
          "type": "box",
          "layout": "horizontal",
          "margin": "md",
          "contents": [
            { "type": "text", "text": "商品A", "size": "sm", "flex": 3 },
            { "type": "text", "text": "¥3,000", "size": "sm", "align": "end", "flex": 2 }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "margin": "sm",
          "contents": [
            { "type": "text", "text": "商品B", "size": "sm", "flex": 3 },
            { "type": "text", "text": "¥5,000", "size": "sm", "align": "end", "flex": 2 }
          ]
        },
        { "type": "separator", "margin": "md" },
        {
          "type": "box",
          "layout": "horizontal",
          "margin": "md",
          "contents": [
            { "type": "text", "text": "合計", "weight": "bold", "size": "md", "flex": 3 },
            { "type": "text", "text": "¥8,000", "weight": "bold", "size": "md", "align": "end", "flex": 2 }
          ]
        }
      ]
    }
  }',
  5
)
ON CONFLICT DO NOTHING;
