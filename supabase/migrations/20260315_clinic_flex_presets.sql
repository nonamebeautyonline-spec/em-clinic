-- クリニック向けFLEXプリセット 30件追加
-- カテゴリ: reservation, follow_up, campaign, info, payment, reminder, qa, general
-- tenant_id: デフォルトテナント

INSERT INTO flex_presets (name, category, description, flex_json, sort_order, tenant_id) VALUES

-- ==================== 予約 (reservation) ====================
(
  '予約確認カード',
  'reservation',
  '予約日時・施術内容・注意事項を表示する確認カード',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#06C755", "paddingAll": "16px",
      "contents": [
        { "type": "text", "text": "✅ ご予約を承りました", "color": "#ffffff", "weight": "bold", "size": "lg" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "📅 日時", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "2026年3月20日 14:00", "size": "sm", "weight": "bold", "flex": 4, "wrap": true }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "💊 施術", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "ダーマペン4", "size": "sm", "weight": "bold", "flex": 4, "wrap": true }
        ]},
        { "type": "separator", "margin": "md" },
        { "type": "text", "text": "⚠️ ご来院前の注意事項", "size": "xs", "color": "#999999", "margin": "md" },
        { "type": "text", "text": "・施術前日の飲酒はお控えください\n・当日はメイクを落としてお越しください", "size": "xs", "color": "#666666", "wrap": true }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "予約内容を確認", "uri": "https://example.com" } },
        { "type": "button", "style": "secondary", "action": { "type": "uri", "label": "予約変更・キャンセル", "uri": "https://example.com/cancel" } }
      ]
    }
  }',
  10, '00000000-0000-0000-0000-000000000001'
),
(
  '予約リマインド（前日）',
  'reservation',
  '予約前日に送るリマインドメッセージ',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#4285F4", "paddingAll": "16px",
      "contents": [
        { "type": "text", "text": "🔔 明日のご予約", "color": "#ffffff", "weight": "bold", "size": "lg" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "{患者名}様", "size": "md", "weight": "bold" },
        { "type": "text", "text": "明日のご予約のリマインドです。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
          { "type": "text", "text": "日時", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "3月20日（木）14:00", "size": "sm", "weight": "bold", "flex": 4 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "施術", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "ヒアルロン酸注入", "size": "sm", "weight": "bold", "flex": 4 }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#4285F4", "action": { "type": "uri", "label": "地図・アクセス", "uri": "https://maps.google.com" } }
      ]
    }
  }',
  11, '00000000-0000-0000-0000-000000000001'
),
(
  '初回カウンセリング予約',
  'reservation',
  '無料カウンセリングへの誘導カード',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/E8F5E9/2E7D32?text=FREE+COUNSELING",
      "size": "full", "aspectRatio": "2:1", "aspectMode": "cover"
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "無料カウンセリング受付中", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "経験豊富な医師が丁寧にカウンセリングいたします。お気軽にご相談ください。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "xs", "margin": "lg", "contents": [
          { "type": "text", "text": "✓ 所要時間：約30分", "size": "xs", "color": "#06C755" },
          { "type": "text", "text": "✓ カウンセリング料：無料", "size": "xs", "color": "#06C755" },
          { "type": "text", "text": "✓ 当日施術も可能", "size": "xs", "color": "#06C755" }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "今すぐ予約する", "uri": "https://example.com/reserve" } }
      ]
    }
  }',
  12, '00000000-0000-0000-0000-000000000001'
),
(
  '空き枠お知らせ',
  'reservation',
  'キャンセル枠の空き情報通知',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#FF6B6B", "paddingAll": "14px",
      "contents": [
        { "type": "text", "text": "🎯 キャンセル枠あり！", "color": "#ffffff", "weight": "bold", "size": "md" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "以下の日程に空きが出ました", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "md",
          "backgroundColor": "#FFF8E1", "cornerRadius": "8px", "paddingAll": "12px",
          "contents": [
            { "type": "text", "text": "3/18（火）15:00〜", "size": "sm", "weight": "bold" },
            { "type": "text", "text": "3/21（金）10:00〜", "size": "sm", "weight": "bold" }
        ]},
        { "type": "text", "text": "※先着順のためお早めにご連絡ください", "size": "xxs", "color": "#999999", "wrap": true }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#FF6B6B", "action": { "type": "uri", "label": "この枠を予約する", "uri": "https://example.com/reserve" } }
      ]
    }
  }',
  13, '00000000-0000-0000-0000-000000000001'
),

-- ==================== フォロー (follow_up) ====================
(
  '施術後フォロー（当日）',
  'follow_up',
  '施術当日に送るアフターケア案内',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#7C4DFF", "paddingAll": "16px",
      "contents": [
        { "type": "text", "text": "💜 施術後のケアについて", "color": "#ffffff", "weight": "bold", "size": "md" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "{患者名}様、本日はご来院ありがとうございました。", "size": "sm", "wrap": true },
        { "type": "separator", "margin": "md" },
        { "type": "text", "text": "📋 術後の注意事項", "size": "sm", "weight": "bold", "margin": "md" },
        { "type": "text", "text": "・施術部位を強くこすらないでください\n・当日の入浴はシャワーのみにしてください\n・激しい運動は24時間お控えください\n・赤み・腫れは数日で引きます", "size": "xs", "color": "#666666", "wrap": true },
        { "type": "text", "text": "気になる症状がある場合はお気軽にご相談ください。", "size": "xs", "color": "#999999", "wrap": true, "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#7C4DFF", "action": { "type": "uri", "label": "相談する", "uri": "https://example.com/contact" } }
      ]
    }
  }',
  20, '00000000-0000-0000-0000-000000000001'
),
(
  '施術後フォロー（1週間後）',
  'follow_up',
  '施術1週間後の経過確認メッセージ',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "施術後1週間の経過確認", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n施術から1週間が経ちましたが、その後の経過はいかがでしょうか？", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "text", "text": "以下の中から該当するものをタップしてください。", "size": "xs", "color": "#999999", "wrap": true, "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "postback", "label": "😊 順調です", "data": "follow_up=good" } },
        { "type": "button", "style": "primary", "color": "#FF9800", "action": { "type": "postback", "label": "🤔 少し気になることがある", "data": "follow_up=concern" } },
        { "type": "button", "style": "primary", "color": "#F44336", "action": { "type": "postback", "label": "😟 相談したい", "data": "follow_up=consult" } }
      ]
    }
  }',
  21, '00000000-0000-0000-0000-000000000001'
),
(
  '再来院促進',
  'follow_up',
  '定期的なメンテナンスを促す再来院案内',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "🔄 次回施術のご案内", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n前回の施術から1ヶ月が経ちました。効果を持続させるため、次回の施術をおすすめいたします。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "xs", "margin": "lg",
          "backgroundColor": "#F3E5F5", "cornerRadius": "8px", "paddingAll": "12px",
          "contents": [
            { "type": "text", "text": "おすすめ施術", "size": "xxs", "color": "#7C4DFF" },
            { "type": "text", "text": "ダーマペン4 メンテナンス", "size": "sm", "weight": "bold" },
            { "type": "text", "text": "¥22,000（税込）", "size": "sm", "color": "#7C4DFF", "weight": "bold" }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#7C4DFF", "action": { "type": "uri", "label": "予約する", "uri": "https://example.com/reserve" } }
      ]
    }
  }',
  22, '00000000-0000-0000-0000-000000000001'
),
(
  '口コミ・レビュー依頼',
  'follow_up',
  '施術後に口コミ投稿をお願いするカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "⭐ ご感想をお聞かせください", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n当院のサービスはいかがでしたか？ぜひご感想をお聞かせください。今後のサービス向上に役立ててまいります。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "text", "text": "口コミ投稿で次回500円OFF！", "size": "sm", "color": "#FF9800", "weight": "bold", "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#FFB800", "action": { "type": "uri", "label": "⭐ 口コミを書く", "uri": "https://example.com/review" } }
      ]
    }
  }',
  23, '00000000-0000-0000-0000-000000000001'
),

-- ==================== キャンペーン (campaign) ====================
(
  '季節キャンペーン',
  'campaign',
  '季節の施術キャンペーン告知カード',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/FF6B6B/FFFFFF?text=SPRING+CAMPAIGN",
      "size": "full", "aspectRatio": "2:1", "aspectMode": "cover"
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "box", "layout": "vertical", "cornerRadius": "4px",
            "backgroundColor": "#FF6B6B", "paddingAll": "4px", "flex": 0,
            "contents": [
              { "type": "text", "text": "期間限定", "size": "xxs", "color": "#ffffff", "weight": "bold" }
          ]},
          { "type": "text", "text": "〜3/31まで", "size": "xs", "color": "#FF6B6B", "weight": "bold", "gravity": "center" }
        ]},
        { "type": "text", "text": "春の美肌キャンペーン", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "人気の3施術が最大30%OFF！\n新生活に向けて、自信の持てる素肌へ。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "separator", "margin": "lg" },
        { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "md", "contents": [
          { "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": "ダーマペン4", "size": "sm", "flex": 3 },
            { "type": "text", "text": "¥22,000 → ¥15,400", "size": "sm", "color": "#FF6B6B", "weight": "bold", "flex": 4, "align": "end" }
          ]},
          { "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": "フォトフェイシャル", "size": "sm", "flex": 3 },
            { "type": "text", "text": "¥18,000 → ¥12,600", "size": "sm", "color": "#FF6B6B", "weight": "bold", "flex": 4, "align": "end" }
          ]}
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#FF6B6B", "action": { "type": "uri", "label": "キャンペーン詳細を見る", "uri": "https://example.com/campaign" } }
      ]
    }
  }',
  30, '00000000-0000-0000-0000-000000000001'
),
(
  '友だち紹介キャンペーン',
  'campaign',
  'お友だち紹介で双方に特典がある紹介キャンペーン',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#FF9800", "paddingAll": "16px",
      "contents": [
        { "type": "text", "text": "🎁 お友だち紹介キャンペーン", "color": "#ffffff", "weight": "bold", "size": "md" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "お友だちをご紹介いただくと\nお互いに¥3,000分のポイントプレゼント！", "size": "sm", "weight": "bold", "wrap": true, "align": "center" },
        { "type": "box", "layout": "horizontal", "spacing": "md", "margin": "lg", "contents": [
          { "type": "box", "layout": "vertical", "cornerRadius": "8px",
            "backgroundColor": "#FFF3E0", "paddingAll": "12px", "flex": 1,
            "contents": [
              { "type": "text", "text": "ご紹介者様", "size": "xxs", "color": "#FF9800", "align": "center" },
              { "type": "text", "text": "¥3,000", "size": "lg", "weight": "bold", "align": "center", "color": "#FF9800" },
              { "type": "text", "text": "ポイント", "size": "xxs", "color": "#999999", "align": "center" }
          ]},
          { "type": "box", "layout": "vertical", "cornerRadius": "8px",
            "backgroundColor": "#FFF3E0", "paddingAll": "12px", "flex": 1,
            "contents": [
              { "type": "text", "text": "お友だち", "size": "xxs", "color": "#FF9800", "align": "center" },
              { "type": "text", "text": "¥3,000", "size": "lg", "weight": "bold", "align": "center", "color": "#FF9800" },
              { "type": "text", "text": "ポイント", "size": "xxs", "color": "#999999", "align": "center" }
          ]}
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#FF9800", "action": { "type": "uri", "label": "紹介コードを送る", "uri": "https://example.com/referral" } }
      ]
    }
  }',
  31, '00000000-0000-0000-0000-000000000001'
),
(
  'モニター募集',
  'campaign',
  '施術モニター募集の案内カード',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/E040FB/FFFFFF?text=MONITOR",
      "size": "full", "aspectRatio": "2:1", "aspectMode": "cover"
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "box", "layout": "vertical", "cornerRadius": "4px",
            "backgroundColor": "#E040FB", "paddingAll": "4px", "flex": 0,
            "contents": [
              { "type": "text", "text": "モニター", "size": "xxs", "color": "#ffffff", "weight": "bold" }
          ]},
          { "type": "text", "text": "残り3名様", "size": "xs", "color": "#E040FB", "weight": "bold", "gravity": "center" }
        ]},
        { "type": "text", "text": "ヒアルロン酸注入\nモニター様募集", "weight": "bold", "size": "xl", "wrap": true },
        { "type": "text", "text": "通常¥55,000 → モニター価格¥33,000\n\nビフォーアフターの写真撮影にご協力いただける方を募集しています。", "size": "sm", "color": "#666666", "wrap": true }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#E040FB", "action": { "type": "uri", "label": "モニターに応募する", "uri": "https://example.com/monitor" } }
      ]
    }
  }',
  32, '00000000-0000-0000-0000-000000000001'
),
(
  '誕生日クーポン',
  'campaign',
  '誕生月の患者に送る特別クーポン',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#FFD700", "paddingAll": "16px",
      "contents": [
        { "type": "text", "text": "🎂 Happy Birthday!", "color": "#333333", "weight": "bold", "size": "xl", "align": "center" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "{患者名}様\nお誕生日おめでとうございます！", "size": "sm", "wrap": true, "align": "center" },
        { "type": "box", "layout": "vertical", "cornerRadius": "12px",
          "backgroundColor": "#FFFDE7", "paddingAll": "16px", "margin": "lg",
          "contents": [
            { "type": "text", "text": "🎁 バースデー特典", "size": "xs", "color": "#FF9800", "align": "center" },
            { "type": "text", "text": "20%OFF", "size": "xxl", "weight": "bold", "align": "center", "color": "#FF6B6B" },
            { "type": "text", "text": "全施術メニュー対象", "size": "xs", "color": "#999999", "align": "center" },
            { "type": "text", "text": "有効期限: お誕生月中", "size": "xxs", "color": "#BBBBBB", "align": "center", "margin": "sm" }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#FFD700", "action": { "type": "uri", "label": "クーポンを使って予約する", "uri": "https://example.com/reserve?coupon=birthday" } }
      ]
    }
  }',
  33, '00000000-0000-0000-0000-000000000001'
),

-- ==================== お知らせ (info) ====================
(
  '休診日のお知らせ',
  'info',
  '臨時休診や年末年始の休診案内',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#F44336", "paddingAll": "14px",
      "contents": [
        { "type": "text", "text": "📢 休診日のお知らせ", "color": "#ffffff", "weight": "bold", "size": "md" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "誠に勝手ながら、下記の日程を休診とさせていただきます。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "lg",
          "backgroundColor": "#FFEBEE", "cornerRadius": "8px", "paddingAll": "12px",
          "contents": [
            { "type": "text", "text": "休診期間", "size": "xxs", "color": "#F44336" },
            { "type": "text", "text": "2026年4月29日（火）〜5月6日（火）", "size": "sm", "weight": "bold" }
        ]},
        { "type": "text", "text": "5月7日（水）より通常診療いたします。\nご迷惑をおかけしますが、よろしくお願いいたします。", "size": "xs", "color": "#999999", "wrap": true, "margin": "md" }
      ]
    }
  }',
  40, '00000000-0000-0000-0000-000000000001'
),
(
  '新メニュー追加',
  'info',
  '新しい施術メニューの導入案内',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/00BCD4/FFFFFF?text=NEW+MENU",
      "size": "full", "aspectRatio": "2:1", "aspectMode": "cover"
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "box", "layout": "vertical", "cornerRadius": "4px",
            "backgroundColor": "#00BCD4", "paddingAll": "4px", "flex": 0,
            "contents": [
              { "type": "text", "text": "NEW", "size": "xxs", "color": "#ffffff", "weight": "bold" }
          ]}
        ]},
        { "type": "text", "text": "ピコレーザー導入！", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "最新のピコレーザー機器を導入しました。従来のレーザーに比べ、ダウンタイムが短く、より効果的にシミ・くすみにアプローチできます。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "text", "text": "導入記念価格: ¥9,800〜", "size": "sm", "color": "#00BCD4", "weight": "bold", "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#00BCD4", "action": { "type": "uri", "label": "詳しく見る", "uri": "https://example.com/menu/pico" } }
      ]
    }
  }',
  41, '00000000-0000-0000-0000-000000000001'
),
(
  'スタッフ紹介',
  'info',
  '新しい医師・スタッフの紹介カード',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/E8EAF6/3F51B5?text=DOCTOR",
      "size": "full", "aspectRatio": "2:1", "aspectMode": "cover"
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "👩‍⚕️ 新しいドクターのご紹介", "weight": "bold", "size": "lg" },
        { "type": "separator", "margin": "sm" },
        { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
          { "type": "text", "text": "氏名", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "山田 花子 医師", "size": "sm", "weight": "bold", "flex": 4 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "専門", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "美容皮膚科", "size": "sm", "flex": 4 }
        ]},
        { "type": "text", "text": "東京大学医学部卒業。大手美容クリニックで10年以上の実績。患者様一人ひとりに寄り添った丁寧なカウンセリングを心がけています。", "size": "xs", "color": "#666666", "wrap": true, "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#3F51B5", "action": { "type": "uri", "label": "山田医師の予約を取る", "uri": "https://example.com/reserve?doctor=yamada" } }
      ]
    }
  }',
  42, '00000000-0000-0000-0000-000000000001'
),
(
  '営業時間変更',
  'info',
  '診療時間の変更案内',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "🕐 診療時間変更のお知らせ", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "4月1日より診療時間を下記の通り変更いたします。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "md", "contents": [
          { "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": "月〜金", "size": "sm", "flex": 2, "weight": "bold" },
            { "type": "text", "text": "10:00 〜 19:00", "size": "sm", "flex": 3 }
          ]},
          { "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": "土曜日", "size": "sm", "flex": 2, "weight": "bold" },
            { "type": "text", "text": "10:00 〜 17:00", "size": "sm", "flex": 3 }
          ]},
          { "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": "日・祝", "size": "sm", "flex": 2, "weight": "bold" },
            { "type": "text", "text": "休診", "size": "sm", "flex": 3, "color": "#F44336" }
          ]}
        ]}
      ]
    }
  }',
  43, '00000000-0000-0000-0000-000000000001'
),

-- ==================== 決済 (payment) ====================
(
  '決済完了通知',
  'payment',
  'オンライン決済完了の通知カード',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#06C755", "paddingAll": "16px",
      "contents": [
        { "type": "text", "text": "✅ お支払い完了", "color": "#ffffff", "weight": "bold", "size": "lg" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "{患者名}様、お支払いありがとうございます。", "size": "sm", "wrap": true },
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
          { "type": "text", "text": "施術内容", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "ダーマペン4", "size": "sm", "flex": 3 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "お支払額", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "¥22,000（税込）", "size": "sm", "weight": "bold", "flex": 3 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "決済方法", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "クレジットカード", "size": "sm", "flex": 3 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "決済日時", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "2026/03/15 14:30", "size": "sm", "flex": 3 }
        ]}
      ]
    }
  }',
  50, '00000000-0000-0000-0000-000000000001'
),
(
  '請求書・明細',
  'payment',
  '施術料金の明細表示カード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "📋 施術明細", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "2026年3月15日", "size": "xs", "color": "#999999" },
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
          { "type": "text", "text": "ダーマペン4", "size": "sm", "flex": 4 },
          { "type": "text", "text": "¥22,000", "size": "sm", "align": "end", "flex": 2 }
        ]},
        { "type": "box", "layout": "horizontal", "contents": [
          { "type": "text", "text": "成長因子パック", "size": "sm", "flex": 4 },
          { "type": "text", "text": "¥5,500", "size": "sm", "align": "end", "flex": 2 }
        ]},
        { "type": "box", "layout": "horizontal", "contents": [
          { "type": "text", "text": "麻酔クリーム", "size": "sm", "flex": 4 },
          { "type": "text", "text": "¥3,300", "size": "sm", "align": "end", "flex": 2 }
        ]},
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
          { "type": "text", "text": "小計", "size": "sm", "color": "#888888", "flex": 4 },
          { "type": "text", "text": "¥30,800", "size": "sm", "align": "end", "flex": 2 }
        ]},
        { "type": "box", "layout": "horizontal", "contents": [
          { "type": "text", "text": "クーポン割引", "size": "sm", "color": "#06C755", "flex": 4 },
          { "type": "text", "text": "-¥3,000", "size": "sm", "color": "#06C755", "align": "end", "flex": 2 }
        ]},
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
          { "type": "text", "text": "合計（税込）", "weight": "bold", "size": "md", "flex": 4 },
          { "type": "text", "text": "¥27,800", "weight": "bold", "size": "md", "align": "end", "flex": 2, "color": "#06C755" }
        ]}
      ]
    }
  }',
  51, '00000000-0000-0000-0000-000000000001'
),
(
  '未払い案内',
  'payment',
  '未決済の料金支払いを促すメッセージ',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "💳 お支払いのご案内", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n下記の施術料金のお支払いが確認できておりません。お手数ですが、お支払いをお願いいたします。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "lg",
          "backgroundColor": "#FFF8E1", "cornerRadius": "8px", "paddingAll": "12px",
          "contents": [
            { "type": "text", "text": "ダーマペン4", "size": "sm" },
            { "type": "text", "text": "¥22,000（税込）", "size": "md", "weight": "bold", "color": "#FF9800" },
            { "type": "text", "text": "お支払い期限: 2026/03/31", "size": "xxs", "color": "#999999" }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#FF9800", "action": { "type": "uri", "label": "オンラインで支払う", "uri": "https://example.com/payment" } }
      ]
    }
  }',
  52, '00000000-0000-0000-0000-000000000001'
),

-- ==================== リマインダー (reminder) ====================
(
  '薬の服用リマインド',
  'reminder',
  '処方薬の服用を促すリマインドメッセージ',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "💊 お薬の時間です", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n処方薬の服用はお済みですか？\n効果を最大限に発揮するため、用法・用量を守って服用をお続けください。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "xs", "margin": "lg", "contents": [
          { "type": "text", "text": "📝 服用のポイント", "size": "xs", "color": "#4285F4", "weight": "bold" },
          { "type": "text", "text": "・毎日同じ時間に服用\n・食後30分以内に服用\n・飲み忘れた場合は気づいた時に", "size": "xs", "color": "#666666", "wrap": true }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "horizontal", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "postback", "label": "✅ 飲みました", "data": "medicine=taken" } },
        { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "⏰ 後で通知", "data": "medicine=later" } }
      ]
    }
  }',
  60, '00000000-0000-0000-0000-000000000001'
),
(
  '定期検診リマインド',
  'reminder',
  '定期検診の時期を知らせるリマインドカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "🏥 定期検診のお知らせ", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n前回の検診から6ヶ月が経ちました。定期的な検診で、お肌の状態を確認しましょう。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "text", "text": "※検診は無料で行っております", "size": "xs", "color": "#06C755", "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "検診の予約をする", "uri": "https://example.com/reserve?type=checkup" } }
      ]
    }
  }',
  61, '00000000-0000-0000-0000-000000000001'
),
(
  '処方薬残量確認',
  'reminder',
  '処方薬の残量を確認し再処方を促すメッセージ',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "💊 お薬の残量はいかがですか？", "weight": "bold", "size": "md" },
        { "type": "text", "text": "{患者名}様\n\n前回の処方からそろそろお薬がなくなる頃かと思います。継続が必要な場合は、お早めに再処方をお申し込みください。", "size": "sm", "color": "#666666", "wrap": true }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "再処方を申し込む", "uri": "https://example.com/reorder" } },
        { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "まだ残っています", "data": "reorder=not_yet" } }
      ]
    }
  }',
  62, '00000000-0000-0000-0000-000000000001'
),

-- ==================== Q&A (qa) ====================
(
  'よくある質問（施術前）',
  'qa',
  '施術前によくある質問と回答のカルーセル',
  '{
    "type": "carousel",
    "contents": [
      {
        "type": "bubble",
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
              { "type": "box", "layout": "vertical", "cornerRadius": "20px",
                "backgroundColor": "#4285F4", "paddingAll": "6px", "flex": 0,
                "contents": [
                  { "type": "text", "text": "Q", "size": "sm", "color": "#ffffff", "weight": "bold", "align": "center" }
              ]},
              { "type": "text", "text": "施術は痛いですか？", "size": "sm", "weight": "bold", "gravity": "center", "wrap": true }
            ]},
            { "type": "separator", "margin": "md" },
            { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
              { "type": "box", "layout": "vertical", "cornerRadius": "20px",
                "backgroundColor": "#FF9800", "paddingAll": "6px", "flex": 0,
                "contents": [
                  { "type": "text", "text": "A", "size": "sm", "color": "#ffffff", "weight": "bold", "align": "center" }
              ]},
              { "type": "text", "text": "麻酔クリームを使用するため、痛みはほとんど感じません。個人差はありますが、チクチクする程度です。", "size": "xs", "color": "#666666", "wrap": true, "gravity": "center" }
            ]}
          ]
        }
      },
      {
        "type": "bubble",
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
              { "type": "box", "layout": "vertical", "cornerRadius": "20px",
                "backgroundColor": "#4285F4", "paddingAll": "6px", "flex": 0,
                "contents": [
                  { "type": "text", "text": "Q", "size": "sm", "color": "#ffffff", "weight": "bold", "align": "center" }
              ]},
              { "type": "text", "text": "ダウンタイムはどのくらい？", "size": "sm", "weight": "bold", "gravity": "center", "wrap": true }
            ]},
            { "type": "separator", "margin": "md" },
            { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
              { "type": "box", "layout": "vertical", "cornerRadius": "20px",
                "backgroundColor": "#FF9800", "paddingAll": "6px", "flex": 0,
                "contents": [
                  { "type": "text", "text": "A", "size": "sm", "color": "#ffffff", "weight": "bold", "align": "center" }
              ]},
              { "type": "text", "text": "施術内容にもよりますが、通常2〜3日で赤みが引きます。翌日からメイクも可能です。", "size": "xs", "color": "#666666", "wrap": true, "gravity": "center" }
            ]}
          ]
        }
      },
      {
        "type": "bubble",
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
              { "type": "box", "layout": "vertical", "cornerRadius": "20px",
                "backgroundColor": "#4285F4", "paddingAll": "6px", "flex": 0,
                "contents": [
                  { "type": "text", "text": "Q", "size": "sm", "color": "#ffffff", "weight": "bold", "align": "center" }
              ]},
              { "type": "text", "text": "何回通えば効果が出ますか？", "size": "sm", "weight": "bold", "gravity": "center", "wrap": true }
            ]},
            { "type": "separator", "margin": "md" },
            { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
              { "type": "box", "layout": "vertical", "cornerRadius": "20px",
                "backgroundColor": "#FF9800", "paddingAll": "6px", "flex": 0,
                "contents": [
                  { "type": "text", "text": "A", "size": "sm", "color": "#ffffff", "weight": "bold", "align": "center" }
              ]},
              { "type": "text", "text": "1回でも効果を感じていただけますが、3〜5回の継続をおすすめしています。", "size": "xs", "color": "#666666", "wrap": true, "gravity": "center" }
            ]}
          ]
        }
      }
    ]
  }',
  70, '00000000-0000-0000-0000-000000000001'
),
(
  'よくある質問（料金）',
  'qa',
  '料金に関するQ&Aカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "lg",
      "contents": [
        { "type": "text", "text": "💰 料金についてのQ&A", "weight": "bold", "size": "lg" },
        { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
          { "type": "text", "text": "Q. カウンセリング料はかかりますか？", "size": "sm", "weight": "bold" },
          { "type": "text", "text": "A. カウンセリングは無料です。施術を決めるまでの相談費用は一切かかりません。", "size": "xs", "color": "#666666", "wrap": true }
        ]},
        { "type": "separator" },
        { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
          { "type": "text", "text": "Q. 分割払いはできますか？", "size": "sm", "weight": "bold" },
          { "type": "text", "text": "A. はい、最大12回までの分割払いに対応しています。月々のお支払いもご相談ください。", "size": "xs", "color": "#666666", "wrap": true }
        ]},
        { "type": "separator" },
        { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
          { "type": "text", "text": "Q. 返金保証はありますか？", "size": "sm", "weight": "bold" },
          { "type": "text", "text": "A. 施術効果に満足いただけない場合、条件に応じて返金制度がございます。詳しくはカウンセリング時にご説明いたします。", "size": "xs", "color": "#666666", "wrap": true }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "料金表を見る", "uri": "https://example.com/price" } }
      ]
    }
  }',
  71, '00000000-0000-0000-0000-000000000001'
),

-- ==================== 汎用 (general) ====================
(
  'お知らせ（シンプル）',
  'general',
  'シンプルなお知らせカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "📢 お知らせ", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "ここにお知らせの本文を入力してください。改行も可能です。", "size": "sm", "color": "#666666", "wrap": true, "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "詳細を見る", "uri": "https://example.com" } }
      ]
    }
  }',
  80, '00000000-0000-0000-0000-000000000001'
),
(
  '画像＋説明＋ボタン',
  'general',
  '画像付きの汎用情報カード',
  '{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://placehold.co/800x400/06C755/FFFFFF?text=IMAGE",
      "size": "full", "aspectRatio": "2:1", "aspectMode": "cover"
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "タイトルを入力", "weight": "bold", "size": "xl" },
        { "type": "text", "text": "説明テキストを入力してください。画像付きのリッチなカードで、施術紹介や商品案内に最適です。", "size": "sm", "color": "#666666", "wrap": true }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "ボタン", "uri": "https://example.com" } }
      ]
    }
  }',
  81, '00000000-0000-0000-0000-000000000001'
),
(
  '選択肢カード',
  'general',
  '複数の選択肢を提示するカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "ご希望の施術をお選びください", "weight": "bold", "size": "lg", "wrap": true },
        { "type": "text", "text": "以下のメニューから気になるものをタップしてください。", "size": "sm", "color": "#666666", "wrap": true }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "postback", "label": "💉 注入系（ヒアルロン酸等）", "data": "menu=injection" } },
        { "type": "button", "style": "primary", "color": "#4285F4", "action": { "type": "postback", "label": "✨ レーザー系（シミ・くすみ）", "data": "menu=laser" } },
        { "type": "button", "style": "primary", "color": "#FF9800", "action": { "type": "postback", "label": "🧴 スキンケア（ピーリング等）", "data": "menu=skincare" } },
        { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "🤔 相談したい", "data": "menu=consult" } }
      ]
    }
  }',
  82, '00000000-0000-0000-0000-000000000001'
),
(
  'カルーセル（施術メニュー）',
  'general',
  '複数の施術メニューを横スクロールで表示',
  '{
    "type": "carousel",
    "contents": [
      {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": "https://placehold.co/600x400/E8F5E9/2E7D32?text=Menu+1",
          "size": "full", "aspectRatio": "3:2", "aspectMode": "cover"
        },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "sm",
          "contents": [
            { "type": "text", "text": "ダーマペン4", "weight": "bold", "size": "lg" },
            { "type": "text", "text": "肌の再生力を高め、毛穴・ニキビ跡・小じわを改善します。", "size": "xs", "color": "#666666", "wrap": true },
            { "type": "text", "text": "¥22,000〜", "size": "sm", "color": "#06C755", "weight": "bold", "margin": "md" }
          ]
        },
        "footer": {
          "type": "box", "layout": "vertical",
          "contents": [
            { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "予約する", "uri": "https://example.com/reserve?menu=derma" } }
          ]
        }
      },
      {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": "https://placehold.co/600x400/E3F2FD/1565C0?text=Menu+2",
          "size": "full", "aspectRatio": "3:2", "aspectMode": "cover"
        },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "sm",
          "contents": [
            { "type": "text", "text": "ヒアルロン酸注入", "weight": "bold", "size": "lg" },
            { "type": "text", "text": "ほうれい線・唇・涙袋など、自然な仕上がりでお顔の印象を変えます。", "size": "xs", "color": "#666666", "wrap": true },
            { "type": "text", "text": "¥55,000〜", "size": "sm", "color": "#4285F4", "weight": "bold", "margin": "md" }
          ]
        },
        "footer": {
          "type": "box", "layout": "vertical",
          "contents": [
            { "type": "button", "style": "primary", "color": "#4285F4", "action": { "type": "uri", "label": "予約する", "uri": "https://example.com/reserve?menu=ha" } }
          ]
        }
      },
      {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": "https://placehold.co/600x400/FFF3E0/E65100?text=Menu+3",
          "size": "full", "aspectRatio": "3:2", "aspectMode": "cover"
        },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "sm",
          "contents": [
            { "type": "text", "text": "ボトックス注入", "weight": "bold", "size": "lg" },
            { "type": "text", "text": "表情じわを目立たなくし、若々しい印象に。エラ・肩こりにも。", "size": "xs", "color": "#666666", "wrap": true },
            { "type": "text", "text": "¥33,000〜", "size": "sm", "color": "#FF9800", "weight": "bold", "margin": "md" }
          ]
        },
        "footer": {
          "type": "box", "layout": "vertical",
          "contents": [
            { "type": "button", "style": "primary", "color": "#FF9800", "action": { "type": "uri", "label": "予約する", "uri": "https://example.com/reserve?menu=botox" } }
          ]
        }
      }
    ]
  }',
  83, '00000000-0000-0000-0000-000000000001'
),
(
  'アンケート',
  'general',
  '施術後の満足度アンケートカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "📝 アンケートのお願い", "weight": "bold", "size": "lg" },
        { "type": "text", "text": "{患者名}様\n\n当院のサービス向上のため、簡単なアンケートにご協力ください。（所要時間：約1分）", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "text", "text": "全体的な満足度をお聞かせください", "size": "sm", "weight": "bold", "margin": "lg" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "postback", "label": "😊 とても満足", "data": "survey=5" } },
        { "type": "button", "style": "primary", "color": "#8BC34A", "action": { "type": "postback", "label": "🙂 満足", "data": "survey=4" } },
        { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "😐 普通", "data": "survey=3" } },
        { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "😕 不満", "data": "survey=2" } }
      ]
    }
  }',
  84, '00000000-0000-0000-0000-000000000001'
),
(
  'LINE登録お礼',
  'general',
  'LINE友だち追加時のウェルカムメッセージ',
  '{
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical",
      "backgroundColor": "#06C755", "paddingAll": "20px",
      "contents": [
        { "type": "text", "text": "🎉 友だち追加ありがとう\nございます！", "color": "#ffffff", "weight": "bold", "size": "lg", "wrap": true, "align": "center" }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "当院のLINE公式アカウントへようこそ！\n\nこちらのアカウントでは以下のサービスをご利用いただけます。", "size": "sm", "color": "#666666", "wrap": true },
        { "type": "box", "layout": "vertical", "spacing": "xs", "margin": "lg", "contents": [
          { "type": "text", "text": "📅 カンタン予約", "size": "sm" },
          { "type": "text", "text": "💬 チャットでお問い合わせ", "size": "sm" },
          { "type": "text", "text": "🎁 限定クーポン配信", "size": "sm" },
          { "type": "text", "text": "📋 施術前の問診入力", "size": "sm" }
        ]},
        { "type": "box", "layout": "vertical", "cornerRadius": "8px",
          "backgroundColor": "#E8F5E9", "paddingAll": "12px", "margin": "lg",
          "contents": [
            { "type": "text", "text": "🎁 友だち追加限定！", "size": "xs", "color": "#06C755", "weight": "bold" },
            { "type": "text", "text": "初回カウンセリング無料 + ¥1,000 OFF クーポンプレゼント", "size": "xs", "color": "#333333", "wrap": true }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "さっそく予約する", "uri": "https://example.com/reserve" } },
        { "type": "button", "style": "secondary", "action": { "type": "uri", "label": "メニュー・料金を見る", "uri": "https://example.com/menu" } }
      ]
    }
  }',
  85, '00000000-0000-0000-0000-000000000001'
),
(
  'ビフォーアフター',
  'general',
  '施術のビフォーアフター写真表示カード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "📸 施術実績（ビフォーアフター）", "weight": "bold", "size": "md" },
        { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
          { "type": "box", "layout": "vertical", "flex": 1, "contents": [
            { "type": "image", "url": "https://placehold.co/400x400/FFE0E0/FF0000?text=Before", "aspectRatio": "1:1", "aspectMode": "cover" },
            { "type": "text", "text": "Before", "size": "xxs", "align": "center", "color": "#999999", "margin": "xs" }
          ]},
          { "type": "box", "layout": "vertical", "flex": 1, "contents": [
            { "type": "image", "url": "https://placehold.co/400x400/E0FFE0/00AA00?text=After", "aspectRatio": "1:1", "aspectMode": "cover" },
            { "type": "text", "text": "After", "size": "xxs", "align": "center", "color": "#999999", "margin": "xs" }
          ]}
        ]},
        { "type": "text", "text": "ダーマペン4（3回施術後）\n毛穴の開きが改善し、肌のキメが整いました。", "size": "xs", "color": "#666666", "wrap": true, "margin": "md" }
      ]
    },
    "footer": {
      "type": "box", "layout": "vertical",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "この施術について相談する", "uri": "https://example.com/contact" } }
      ]
    }
  }',
  86, '00000000-0000-0000-0000-000000000001'
),
(
  'クリニック情報カード',
  'general',
  'クリニックの基本情報を表示するカード',
  '{
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "🏥 クリニック情報", "weight": "bold", "size": "lg" },
        { "type": "separator", "margin": "md" },
        { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
          { "type": "text", "text": "住所", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "東京都渋谷区○○1-2-3\nビル4F", "size": "sm", "flex": 4, "wrap": true }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "電話", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "03-1234-5678", "size": "sm", "flex": 4 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "診療時間", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "10:00〜19:00", "size": "sm", "flex": 4 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "休診日", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "日曜・祝日", "size": "sm", "flex": 4 }
        ]},
        { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
          { "type": "text", "text": "アクセス", "size": "sm", "color": "#888888", "flex": 2 },
          { "type": "text", "text": "渋谷駅 徒歩3分", "size": "sm", "flex": 4 }
        ]}
      ]
    },
    "footer": {
      "type": "box", "layout": "horizontal", "spacing": "sm",
      "contents": [
        { "type": "button", "style": "primary", "color": "#06C755", "action": { "type": "uri", "label": "📞 電話する", "uri": "tel:0312345678" } },
        { "type": "button", "style": "primary", "color": "#4285F4", "action": { "type": "uri", "label": "📍 地図", "uri": "https://maps.google.com" } }
      ]
    }
  }',
  87, '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;
