// 類似サービスの解説(補充分)。図鑑の「類似サービスとの違い」に表示する。
// SIMILAR_PAIRS: AWS 内の 1 対 1 の比較 { a, b, same: 共通点, diff: 違い, choose: 選び方 }(両方のサービスのページに表示)
// SIMILAR_EXT: AWS 以外のよく比較されるサービス { サービスID: [[名前, 提供元, 特徴と違い]] }
// 学習用の整理。仕様は変わることがあるため、最新の内容は公式ドキュメントで確認する。
import { PAIRS_X, EXT_X } from "./similar-x.js";

export const SIMILAR_PAIRS = [
  { a: "auroradsql", b: "aurora",
    same: "どちらも PostgreSQL 互換の SQL とトランザクションを使えるリレーショナルデータベースで、分散したストレージによって 1 台のサーバーの枠を超える可用性・拡張性を持たせています。",
    diff: "Aurora のグローバルデータベースは、書き込みはプライマリリージョンだけで、セカンダリリージョンは読み取り専用のアクティブ・パッシブ構成です。Aurora Limitless Database は、1 つのリージョン内で自動シャーディングにより巨大な書き込み負荷を処理することに特化しています。Aurora DSQL は、複数のリージョンのすべてで書き込みができるアクティブ・アクティブ構成を、インスタンスの管理なしのサーバーレスで実現します。",
    choose: "複数リージョンのどこからでも書き込み、サーバーの管理もしたくないなら Aurora DSQL。書き込みは 1 リージョンでよく、既存の PostgreSQL / MySQL との互換性や機能を重視するなら Aurora(1 リージョンで桁違いの書き込みなら Limitless)。" },
  { a: "auroradsql", b: "dynamodb",
    same: "どちらもサーバーレスで、容量やスケールの上限をほとんど意識せずに使え、複数のリージョンでアクティブ・アクティブに書き込める構成(DynamoDB はグローバルテーブル)を組める点で、考え方がよく似ています。",
    diff: "DynamoDB は NoSQL(キーバリュー・ドキュメント)で、JOIN を含む複雑な SQL や厳密なリレーショナルの制約を扱うには、アクセスパターンに合わせたテーブル設計の工夫が必要です。Aurora DSQL は、PostgreSQL の SQL と ACID のトランザクションを保ったまま、NoSQL のようにサーバーレスでグローバルに拡張できるデータベースです。",
    choose: "SQL・JOIN・トランザクションをそのまま使いたいなら Aurora DSQL。アクセスパターンが決まっていて、キーによる単純で超大量の読み書きを低遅延で処理したいなら DynamoDB。" },
  ...PAIRS_X,
];

export const SIMILAR_EXT = {
  auroradsql: [
    ["CockroachDB", "Cockroach Labs(商用 / OSS)", "Aurora DSQL の考え方に最も近い代表的な分散 SQL データベース。PostgreSQL 互換で、データの自動分散、高い耐障害性、マルチリージョンでのアクティブ・アクティブな書き込みと強い整合性を得意とします。"],
    ["YugabyteDB", "Yugabyte(OSS)", "PostgreSQL 互換のオープンソースの分散 SQL データベース。マルチクラウドやハイブリッドクラウドも含めて、グローバル規模のトランザクションと高可用性を実現する設計で、Aurora DSQL とよく比較されます。"],
    ["Google Cloud Spanner", "Google Cloud", "グローバル規模での強い整合性(ACID)と水平スケール、マルチリージョンでの書き込みを商用で実現した分散 SQL の先駆け。Aurora DSQL が目指す方向と非常に近いサービスです。"],
    ["TiDB", "PingCAP(OSS)", "MySQL 互換のオープンソースの分散 SQL データベース(NewSQL)。トランザクション処理と分析処理の両立(HTAP)に強く、大量のデータを分散して自動で拡張します。"],
  ],
  ...EXT_X,
};
