// サービス知識問題(資格試験の問題とは別枠)。データは data/bank/SERVICE.js(tools/build-service-questions.mjs で生成)。
import bank from "./bank/SERVICE.js";

export const SERVICE_KINDS = bank.kinds;
export const serviceQuestions = bank.q.map(([id, cat, kind, lv, concept, prompt, options, answer, explanation, lines, whys, service]) => ({
  id, prompt, concept, explanation, lines, service,
  kind: "service",
  topic: concept,
  domain: cat,
  difficulty: lv,
  exams: {},
  certification: "SERVICE",
  certifications: [],
  selectCount: answer.length,
  choices: options.map((text, i) => ({ text, correct: answer.includes(i), explanation: whys[i] || "" })),
  reviewStatus: "サービス図鑑の内容から作成した知識確認問題(資格試験の問題とは別枠)",
}));
