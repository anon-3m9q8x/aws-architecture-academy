// サービスごとの個人メモと「学習済み」(旧・学習ノートのデータを引き継ぐ)。
// 保存キーは学習ノート時代と同じ aaa.notebook.v1 なので、これまでのメモはそのまま残る。
import { byId } from "./services.js";
const KEY = "aaa.notebook.v1";
let state = { notes: {}, favorites: [], completed: [] };
let ok = true;
function sanitize(raw) {
  const clean = { notes: {}, favorites: [], completed: [] };
  if (!raw || typeof raw !== "object") return clean;
  if (raw.notes && typeof raw.notes === "object")
    for (const [id, text] of Object.entries(raw.notes))
      if (byId.has(id) && typeof text === "string" && text.length <= 20000) clean.notes[id] = text;
  for (const k of ["favorites", "completed"])
    if (Array.isArray(raw[k])) clean[k] = [...new Set(raw[k].filter((id) => byId.has(id)))];
  return clean;
}
try {
  state = sanitize(JSON.parse(localStorage.getItem(KEY) || "null"));
} catch {
  ok = false;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    ok = true;
  } catch {
    ok = false;
    document.getElementById("storage-warning").hidden = false;
  }
  window.dispatchEvent(new Event("learning-update"));
}
export const memo = {
  get: (id) => state.notes[id] || "",
  set(id, text) {
    if (text.trim()) state.notes[id] = text.slice(0, 20000);
    else delete state.notes[id];
    save();
  },
  isDone: (id) => state.completed.includes(id),
  toggleDone(id) {
    state.completed = state.completed.includes(id) ? state.completed.filter((x) => x !== id) : [...state.completed, id];
    save();
    return state.completed.includes(id);
  },
  doneCount: () => state.completed.length,
  noteCount: () => Object.keys(state.notes).length,
  stored: () => ok,
  exportFile() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, ...state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aws-study-notes.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  /** 既存のメモは消さずに追記する(非破壊の取り込み) */
  async importFile(file) {
    if (file.size > 1000000) throw Error("1MB以下のファイルを選んでください");
    const parsed = JSON.parse(await file.text());
    if (parsed.schemaVersion !== 1 || !parsed.notes || !Array.isArray(parsed.completed)) throw Error("対応するバックアップ形式ではありません");
    const incoming = sanitize(parsed);
    const next = { ...state.notes };
    for (const [id, text] of Object.entries(incoming.notes)) {
      const old = next[id] || "";
      const merged = !old ? text : old.includes(text) ? old : `${old}\n\n【取り込んだメモ】\n${text}`;
      if (merged.length > 20000) throw Error("結合後のメモが長すぎます");
      next[id] = merged;
    }
    state.notes = next;
    state.completed = [...new Set([...state.completed, ...incoming.completed])];
    save();
    return Object.keys(incoming.notes).length;
  },
};
