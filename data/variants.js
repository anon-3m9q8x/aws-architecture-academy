// サービスの「種類・発展形・関連機能」(例: EBS のボリュームタイプ)。図鑑の解説ページに表示する。
// 各項目: [名前, 区分, 一言(カード用), 詳しい説明, 使いどころ, 試験・設計のポイント]
// 区分: 種類 = 同じサービス内の選択肢 / 機能 = 付随する重要機能 / 発展 = 上位版・派生サービス
// 仕様・上限値は変わるため、数値は代表的なものに留め、詳細は公式ドキュメントで確認する。
import { VARIANTS_A } from "./variants-a.js";
import { VARIANTS_B } from "./variants-b.js";
export const VARIANTS = { ...VARIANTS_A, ...VARIANTS_B };
