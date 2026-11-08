// サービスの「主な機能」の詳しい解説。図鑑の解説ページで機能をクリック(タップ)すると、種類・発展形と同じダイアログで表示する。
// 各サービス: features と同じ順序の配列。各項目 = [詳しい説明, 使いどころ, 試験・設計のポイント]
// 強調: ==重要== は黄色のマーカー(試験の要点)、!!注意!! は赤下線(ひっかけ・制限・費用)。1 項目あたり 1〜3 か所程度に絞る(variants.js と同じ記法)。
// 仕様・上限値は変わるため、数値は代表的なものに留め、詳細は公式ドキュメントで確認する。
import { F1 } from "./features-1.js";
import { F2 } from "./features-2.js";
import { F3 } from "./features-3.js";
import { F4 } from "./features-4.js";
import { F5 } from "./features-5.js";
import { F6 } from "./features-6.js";
import { F7 } from "./features-7.js";
import { F8 } from "./features-8.js";
import { F9 } from "./features-9.js";
import { F10 } from "./features-10.js";
export const FEATURES = { ...F1, ...F2, ...F3, ...F4, ...F5, ...F6, ...F7, ...F8, ...F9, ...F10 };
