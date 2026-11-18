// 上級チャレンジ: 各資格の試験の想定レベルより難しい、専門性の高い問題(通常の資格問題演習とは別枠)。
// データは data/expert/<試験コード>.json(tools で生成)。問題 ID は <試験コード>-X01 〜。
// 通常の問題と同じ形に整え、kind: "expert" を付ける(学習計画・前日の復習・成績の集計には含めない)。
import { examByCode } from "./exams.js";
import raw from "./expert/all.js";

export const expertQuestions = raw
  .filter((q) => q && examByCode.has(q.id.split("-").slice(0, 2).join("-")))
  .map((q) => {
    const code = q.id.split("-").slice(0, 2).join("-");
    const ex = examByCode.get(code);
    return {
      id: q.id,
      kind: "expert",
      prompt: q.prompt,
      topic: q.topic,
      concept: q.concept,
      why: q.why,
      explanation: q.explanation,
      lines: [],
      domain: ex.domains[q.domain - 1]?.[0] || "",
      difficulty: 3,
      exams: { [code]: [q.domain, "expert"] },
      certification: code.split("-")[0],
      certifications: [code.split("-")[0]],
      selectCount: q.selectCount || 1,
      choices: q.choices.map((c) => ({ text: c.text, correct: !!c.correct, explanation: c.explanation || "", marks: [] })),
      reviewStatus: "上級チャレンジ(オリジナル問題 / 試験の想定レベルを超える難度。実際の試験問題ではありません)",
    };
  });
