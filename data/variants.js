// サービスの「種類・発展形・関連機能」(例: EBS のボリュームタイプ、Bedrock の Data Automation)。図鑑の解説ページに表示する。
// データは data/variants/part-01.js 〜 part-26.js(図鑑のカテゴリ順にサービスを分けたもの)。サービス ID ごとに項目の配列を持つ。
// 各項目(8 要素): [名前, 区分, 一言(カード用), 詳しい説明, 使いどころ, 試験・設計のポイント, 押さえる仕様(2〜4 個の配列), 混同しやすいもの・違い]
// 区分: 種類 = 同じサービス内の選択肢 / 機能 = 付随する重要機能 / 発展 = 上位版・派生サービス・発展機能
// 強調: 本文の中で ==重要== は黄色のマーカー(試験の要点)、!!注意!! はオレンジ(ひっかけ・制限・費用)。1 項目あたり 2〜5 か所に絞る。名前と一言には使わない。
// 仕様・上限値は変わるため、数値は代表的なものに留め、詳細は公式ドキュメントで確認する。
// 追加・書き換えたら node tools/check-variants.mjs で形式を検査する。
import { PART as P01 } from "./variants/part-01.js";
import { PART as P02 } from "./variants/part-02.js";
import { PART as P03 } from "./variants/part-03.js";
import { PART as P04 } from "./variants/part-04.js";
import { PART as P05 } from "./variants/part-05.js";
import { PART as P06 } from "./variants/part-06.js";
import { PART as P07 } from "./variants/part-07.js";
import { PART as P08 } from "./variants/part-08.js";
import { PART as P09 } from "./variants/part-09.js";
import { PART as P10 } from "./variants/part-10.js";
import { PART as P11 } from "./variants/part-11.js";
import { PART as P12 } from "./variants/part-12.js";
import { PART as P13 } from "./variants/part-13.js";
import { PART as P14 } from "./variants/part-14.js";
import { PART as P15 } from "./variants/part-15.js";
import { PART as P16 } from "./variants/part-16.js";
import { PART as P17 } from "./variants/part-17.js";
import { PART as P18 } from "./variants/part-18.js";
import { PART as P19 } from "./variants/part-19.js";
import { PART as P20 } from "./variants/part-20.js";
import { PART as P21 } from "./variants/part-21.js";
import { PART as P22 } from "./variants/part-22.js";
import { PART as P23 } from "./variants/part-23.js";
import { PART as P24 } from "./variants/part-24.js";
import { PART as P25 } from "./variants/part-25.js";
import { PART as P26 } from "./variants/part-26.js";
export const VARIANTS = {};
for (const part of [P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21, P22, P23, P24, P25, P26]) {
  for (const [id, items] of Object.entries(part)) if (items.length) VARIANTS[id] = items;
}
