// 産廃単価表データ
// 各社の紙の単価表を書き起こしたものです。読み取りにくい箇所は note に "要確認" と記載しています。
// 実際の請求時は必ず現物の単価表と照らし合わせ、画面下の「単価表を編集」からこの内容を修正してください。

const TAX_RATE = 0.10;

function incl(priceExcl) {
  if (priceExcl === null || priceExcl === undefined) return null;
  return Math.round(priceExcl * (1 + TAX_RATE));
}

const COMPANIES = {
  tsukasa: {
    name: "株式会社ツカサ・エコ・プランニング",
    subtitle: "受入料金表（2025年2月1日改正）",
    tel: "042-578-8800",
    items: [
      { id: "t1", category: "廃プラスチック類", name: "断熱材（グラスウール・ロックウール）", unit: "kg", priceExcl: 55, priceIncl: 61, cashDiscount: true },
      { id: "t2", category: "廃プラスチック類", name: "発泡スチロール・ウレタン・スプリングなしマット", unit: "kg", priceExcl: 85, priceIncl: 94, cashDiscount: true },
      { id: "t3", category: "繊維くず", name: "布団・カーペット類・化学繊維類（※羽毛布団は受入不可）", unit: "m3", priceExcl: 12000, priceIncl: 13200 },
      { id: "t4", category: "木くず", name: "通常木くず", unit: "kg", priceExcl: 65, priceIncl: 72 },
      { id: "t5", category: "生木", name: "葉・枝のみ（※幹・根・竹・枕木などは受入不可）", unit: "kg", priceExcl: 30, priceIncl: 33 },
      { id: "t6", category: "紙くず A", name: "リサイクル可能物（ダンボール）", unit: "kg", priceExcl: 60, priceIncl: 66 },
      { id: "t7", category: "紙くず B", name: "リサイクル不能物（焼却物）", unit: "m3", priceExcl: 1000, priceIncl: 1100, cashDiscount: true },
      { id: "t8", category: "紙くず C", name: "クロス", unit: "kg", priceExcl: 65, priceIncl: 72 },
      { id: "t9", category: "金属くず", name: "金属くず", unit: "kg", priceExcl: 65, priceIncl: 72, cashDiscount: true },
      { id: "t10", category: "ガラス・陶磁器くず", name: "日本瓦・ガラス・サイディング・モルタル・ALC", unit: "m3", priceExcl: 3000, priceIncl: 3300 },
      { id: "t11", category: "石膏ボード A", name: "リサイクル可能物（水濡れ等ないもの）", unit: "m3", priceExcl: 17000, priceIncl: 18700 },
      { id: "t12", category: "石膏ボード B", name: "水濡れ・ミンチ状のもの", unit: "kg", priceExcl: 45, priceIncl: 50, cashDiscount: true },
      { id: "t13", category: "石綿含有材（アスベスト）", name: "受入不可", unit: "kg", priceExcl: null, priceIncl: null, disabled: true },
      { id: "t14", category: "混合物 A", name: "混合物", unit: "kg", priceExcl: null, priceIncl: null, note: "要確認：単価が読み取れませんでした" },
      { id: "t15", category: "混合物 B", name: "家庭残置混合物", unit: "kg", priceExcl: 65, priceIncl: 72, cashDiscount: true },
      { id: "t16", category: "混合物 C", name: "解体系混合物（土砂系混合・ミンチ状／異物混入）", unit: "kg", priceExcl: 65, priceIncl: 72 },
      { id: "t16b", category: "混合物 C", name: "解体系混合物（土砂系混合・ミンチ状／異物混入）※体積換算", unit: "m3", priceExcl: 22000, priceIncl: 24200, note: "要確認：どの区分の㎥単価か要確認" },
      // 別途料金（混合物に混入している場合に加算）
      { id: "t20", category: "別途料金", name: "畳A（水濡れ・型崩れ無し）", unit: "枚", priceExcl: 1800, priceIncl: 1980 },
      { id: "t21", category: "別途料金", name: "畳B（水濡れ・型崩れしている）", unit: "枚", priceExcl: 3500, priceIncl: 3850 },
      { id: "t22", category: "別途料金", name: "廃タイヤA（4t車まで）", unit: "本", priceExcl: 1000, priceIncl: 1100 },
      { id: "t23", category: "別途料金", name: "消火器", unit: "本", priceExcl: 2000, priceIncl: 2200, note: "2,000円〜（要相談）" },
      { id: "t24", category: "別途料金", name: "ソファA（一人掛け）", unit: "個", priceExcl: 2000, priceIncl: 2200 },
      { id: "t25", category: "別途料金", name: "ソファB（二人掛け以上）", unit: "個", priceExcl: 4000, priceIncl: 4400 },
      { id: "t26", category: "別途料金", name: "マットレス（中にスプリング等がある物）", unit: "枚", priceExcl: 5000, priceIncl: 5500 },
      { id: "t27", category: "別途料金", name: "マニフェスト伝票", unit: "枚", priceExcl: 50, priceIncl: 55 },
      { id: "t28", category: "別途料金", name: "委託契約書", unit: "枚", priceExcl: 50, priceIncl: 55 },
      { id: "t29", category: "別途料金", name: "処理困難物（金庫）", unit: "m3", priceExcl: 35000, priceIncl: 38500, note: "1m³あたり。他応相談" },
    ],
    notes: [
      "現金でお支払いの場合に限り、表内の網掛け品目が表示価格より500円引き（各行に反映済み・チェックボックスで切替可）",
      "断熱材・発泡スチロール・ウレタンが混入していた場合、㎥精算となります",
      "定休日：日曜、第2・第4土曜日（変更の場合あり）",
    ],
  },

  marumatsu: {
    name: "有限会社丸松産業／エコファースト株式会社",
    subtitle: "産業廃棄物 価格表（改 2026年3月）",
    tel: "048-478-2000",
    // 廃プラ料金は搬入方法によって3段階。タイヤ等の追加料金アイテムはこの単価を参照する
    plasticRateTiers: [
      { label: "箱車・ホロ車", priceExcl: 91 },
      { label: "手おろし（箱車・ホロ車以外）", priceExcl: 76 },
      { label: "軽自動車（ホロ車以外）／手おろし以外", priceExcl: 69 },
    ],
    woodRateTiers: [
      { label: "箱車・ホロ車", priceExcl: 51 },
      { label: "箱車・ホロ車以外", priceExcl: 30 },
    ],
    items: [
      {
        id: "m1", category: "廃プラスチック類", name: "廃プラスチック類（※最低搬入量150kg）", unit: "kg",
        type: "tiered", tiers: "plasticRateTiers",
        note: "タイルカーペット・フロアマット・塩ビ系(1m以内カット品)、畳・トタン・波板・雨どい・金属くず・金庫を含む。生ごみ・お弁当（空容器使用済み）不可、医療系混入不可",
      },
      {
        id: "m2", category: "廃プラ＋追加料金", name: "処理困難物布団", unit: "枚",
        type: "plastic_plus_unit", addOnPerUnit: 1000,
      },
      {
        id: "m3", category: "廃プラ＋追加料金", name: "タイヤ（ホイル無）", unit: "本",
        type: "plastic_plus_unit", addOnPerUnit: 1000,
      },
      {
        id: "m4", category: "廃プラ＋追加料金", name: "タイヤ（ホイル有）", unit: "本",
        type: "plastic_plus_unit", addOnPerUnit: 1500,
      },
      {
        id: "m5", category: "廃プラ＋追加料金", name: "ベッドマット", unit: "枚",
        type: "plastic_plus_unit", addOnPerUnit: 2000,
      },
      {
        id: "m6", category: "廃プラ＋追加料金", name: "ベッドマット（ポケットコイル型）", unit: "枚",
        type: "plastic_plus_unit", addOnPerUnit: 8000,
      },
      {
        id: "m7", category: "廃プラ＋追加料金", name: "ソファー1人用", unit: "台",
        type: "plastic_plus_unit", addOnPerUnit: 1500,
      },
      {
        id: "m8", category: "廃プラ＋追加料金", name: "ソファー2人用", unit: "台",
        type: "plastic_plus_unit", addOnPerUnit: 3000,
      },
      {
        id: "m9", category: "廃プラ＋追加料金", name: "ソファー3人用", unit: "台",
        type: "plastic_plus_unit", addOnPerUnit: 3500,
      },
      {
        id: "m10", category: "廃プラ＋追加料金", name: "ビジネスチェアー", unit: "台",
        type: "plastic_plus_unit", addOnPerUnit: 2500,
      },
      {
        id: "m11", category: "木くず", name: "木くず・木製パレット（※最低搬入量150kg／木製家具類は解体物に限る）", unit: "kg",
        type: "tiered", tiers: "woodRateTiers",
      },
      { id: "m12", category: "生木", name: "生木、枝、枯葉（土・砂類の付着がないもの）", unit: "m3", priceExcl: 9500, priceIncl: incl(9500), note: "最低搬入量0.5m³" },
      { id: "m13", category: "断熱材等", name: "断熱材、発泡スチロール、ウレタン（水分を含まないもの）", unit: "m3", priceExcl: 8000, priceIncl: incl(8000), note: "最低搬入量0.5m³" },
      { id: "m14", category: "石膏ボード", name: "石膏ボード（紙不着可・軽カル版付着可）", unit: "m3", priceExcl: 23000, priceIncl: incl(23000), note: "最低搬入量0.5m³" },
      { id: "m15", category: "がれき類", name: "がれき類・ガラス・陶磁器くず・瓦", unit: "m3", priceExcl: 25000, priceIncl: incl(25000), note: "最低搬入量0.5m³" },
      { id: "m16", category: "下ごみ", name: "下ごみ（木っ端混入等・残土等）", unit: "m3", priceExcl: 25000, priceIncl: incl(25000), note: "最低搬入量0.5m³" },
      { id: "m17", category: "計量手数料", name: "計量手数料（2回台貫・1回）", unit: "回", priceExcl: 2000, priceIncl: incl(2000) },
    ],
    forbidden: [
      "生ごみ", "臭いの強いもの", "汚泥", "燃え殻", "ばいじん", "廃油", "塗料", "洗剤", "液体状",
      "スプレー缶", "危険物", "火器類", "消火器", "コロニアル（屋根材）", "アスベスト（ロックウール含む）",
      "医療系廃棄物", "ソーラーパネル1式", "蛍光灯", "リサイクル家電（エアコン・テレビ・洗濯機・冷蔵庫）",
    ],
    notes: [
      "受付時間：午前8:30〜11:30／午後13:00〜16:30、休業日：土曜・日曜・祝日不定期",
      "マニフェスト伝票の持参（処理）と処分委託契約書を結ぶことが廃掃法で決められています。マニフェスト伝票は受付時に必ずご提出をお願いします",
      "材質などにより料金が変更になる場合があります",
    ],
  },

  koei: {
    name: "株式会社コーエイクリーン／株式会社コーエイサービス",
    subtitle: "価格表（令和7年）／KOEI",
    items: [
      { id: "k1", category: "混合A", name: "混合A（リサイクル可能な混合：木くず・紙くず・鉄くず等）", unit: "m3", priceExcl: 9000, priceIncl: incl(9000) },
      { id: "k2", category: "混合B", name: "混合B（廃プラ〈軟質〉）", unit: "m3", priceExcl: 12000, priceIncl: incl(12000) },
      { id: "k3", category: "混合BA", name: "混合BA（がれき・ガラ・二次製品）", unit: "m3", priceExcl: 13000, priceIncl: incl(13000) },
      { id: "k4", category: "混合BB", name: "混合BB（安定型埋立・FRP・岩綿吸音板〈単品〉・陶磁器・タイル・ガラス・ALC）", unit: "m3", priceExcl: 18000, priceIncl: incl(18000) },
      { id: "k5", category: "混合C", name: "混合C（解体混合廃棄物ボード無し・反物〈ロール類〉）", unit: "m3", priceExcl: 20000, priceIncl: incl(20000) },
      { id: "k6", category: "混合CB", name: "混合CB（解体混合廃棄物ボード有り・岩綿吸音板〈ボード付き〉）", unit: "m3", priceExcl: 23000, priceIncl: incl(23000) },
      { id: "k7", category: "混合CC", name: "混合CC（焼却物を多く含む解体混合廃棄物）", unit: "m3", priceExcl: 25000, priceIncl: incl(25000) },
      { id: "k8", category: "処理困難物", name: "処理困難物（長尺・防水シート・Pタイル・ばらし作業が必要な物）", unit: "m3", priceExcl: 18000, priceIncl: incl(18000) },
      {
        id: "k9", category: "OAフロア", name: "OAフロア（プラ）", unit: "m3",
        type: "variant",
        variants: [
          { label: "プラ", priceExcl: 15000 },
          { label: "鉄", priceExcl: 18000 },
          { label: "木混じり", priceExcl: 25000 },
        ],
      },
      { id: "k10", category: "石膏ボード", name: "石膏ボード単品（裸積み）", unit: "m3", priceExcl: 10000, priceIncl: incl(10000) },
      { id: "k11", category: "石膏ボード", name: "石膏ボードB（袋入り・他の物との相積み・付着物有り）", unit: "m3", priceExcl: 12000, priceIncl: incl(12000), note: "付着物有りの場合は混合CB扱い" },
      { id: "k12", category: "パーテーション", name: "パーテーション（ボード・ウレタン・紙）", unit: "m3", priceExcl: 18000, priceIncl: incl(18000) },
      { id: "k13", category: "瓦", name: "黒瓦・赤瓦", unit: "m3", priceExcl: 12000, priceIncl: incl(12000) },
      {
        id: "k14", category: "木くず", name: "木くず（単品）", unit: "m3",
        type: "variant",
        variants: [
          { label: "通常", priceExcl: 8000 },
          { label: "生木", priceExcl: 15000 },
          { label: "枕木・松杭", priceExcl: 20000 },
        ],
      },
      {
        id: "k15", category: "タイルカーペット", name: "タイルカーペット", unit: "m3",
        type: "variant",
        variants: [
          { label: "付着物・汚れ無し", priceExcl: 15000 },
          { label: "付着物・汚れあり", priceExcl: 18000 },
        ],
      },
      { id: "k16", category: "焼却", name: "焼却（繊維くず〈ジュータン・布団〉・残置物・クロス・廃プラ）", unit: "m3", priceExcl: 15000, priceIncl: incl(15000) },
      {
        id: "k17", category: "サイディング", name: "サイディング", unit: "m3",
        type: "variant",
        variants: [
          { label: "通常", priceExcl: 15000 },
          { label: "チップ入り", priceExcl: 20000 },
        ],
      },
      {
        id: "k18", category: "ベッドマット", name: "ベッドマット", unit: "枚",
        type: "variant",
        variants: [
          { label: "S", priceExcl: 3000 },
          { label: "SW", priceExcl: 4000 },
          { label: "W", priceExcl: 5000 },
        ],
      },
      {
        id: "k19", category: "ポケットコイルマットレス", name: "ポケットコイルマットレス", unit: "枚",
        type: "variant",
        variants: [
          { label: "S", priceExcl: 6000 },
          { label: "SW", priceExcl: 8000 },
          { label: "W", priceExcl: 10000 },
        ],
      },
      {
        id: "k20", category: "廃油", name: "廃油", unit: "缶",
        type: "variant",
        variants: [
          { label: "一斗缶", priceExcl: 2500 },
          { label: "ペール缶", priceExcl: 3000 },
          { label: "ドラム缶", priceExcl: 25000 },
        ],
      },
      {
        id: "k21", category: "畳", name: "畳", unit: "枚",
        type: "variant",
        variants: [
          { label: "通常", priceExcl: 1500 },
          { label: "腐食畳", priceExcl: 3000 },
        ],
      },
      { id: "k22", category: "自然石・庭石", name: "自然石・庭石", unit: "kg", priceExcl: 10, priceIncl: incl(10), note: "大きい場合は要相談" },
      {
        id: "k23", category: "タイヤ・消火器", name: "タイヤ（小）・消火器（小）", unit: "本",
        type: "variant",
        variants: [
          { label: "小", priceExcl: 2000 },
          { label: "中", priceExcl: 3000 },
          { label: "大", priceExcl: 4000 },
        ],
      },
      { id: "k24", category: "収集運搬費", name: "収集運搬費", unit: "台", priceExcl: 15000, priceIncl: incl(15000), note: "現場によって変動（15,000円〜）" },
    ],
    notes: [
      "アスベストの疑いがある物は分析表が必要。分析表がない場合はアスベストとして処分となります",
    ],
  },
};
