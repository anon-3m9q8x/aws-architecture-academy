// コマンド・ポリシー演習: API リクエストの模擬実行。Method / URL / Headers / Body を受け取り、模擬環境の API Gateway・
// DynamoDB・Lambda・S3 の振る舞いを再現してレスポンスを返す。ネットワークには一切送信しない。
// 署名(SigV4)は役割を学ぶためのダミーで、Credential=SIMULATED-<名前> の形だけを受け付ける。本物のアクセスキーは拒否する。
import { parseJson } from "./json.js";
import { evaluate } from "./simulator-iam.js";

/** 本物の認証情報らしい文字列(アクセスキー ID・シークレットキー・セッショントークン)を検出 */
export function looksLikeSecret(s) {
  if (!s) return false;
  return /\b(AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/.test(s) || /aws_secret_access_key|SecretAccessKey"\s*:\s*"[A-Za-z0-9/+]{40}"/.test(s) || /(^|[^A-Za-z0-9/+])[A-Za-z0-9/+]{40}([^A-Za-z0-9/+=]|$)/.test(s.replace(/SIMULATED-[^/\s]+/g, "")) && /secret|token|key/i.test(s);
}

/** "Key: Value" の行を Headers に。名前は小文字で扱う(HTTP ヘッダー名は大文字・小文字を区別しない) */
export function parseHeaders(text) {
  const out = {}, errors = [];
  (text || "").split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const m = /^([A-Za-z0-9-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!m) errors.push(`${i + 1} 行目「${line.trim()}」はヘッダーの形(名前: 値)ではありません`);
    else out[m[1].toLowerCase()] = m[2].trim();
  });
  return { headers: out, errors };
}

const reason = { 200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict", 413: "Payload Too Large", 415: "Unsupported Media Type", 429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway" };
const json = (status, body, headers = {}) => ({ status, statusText: reason[status] || "", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body, null, 2), data: body });
const xml = (status, code, message, extra = "") => ({ status, statusText: reason[status] || "", headers: { "content-type": "application/xml" }, body: `<?xml version="1.0" encoding="UTF-8"?>\n<Error>\n  <Code>${code}</Code>\n  <Message>${message}</Message>${extra}\n  <RequestId>SIMULATED0001</RequestId>\n</Error>`, data: { Code: code, Message: message } });
const clone = (x) => JSON.parse(JSON.stringify(x));

export function newApiSession(env) { return { env: clone(env), history: [] }; }

/**
 * req = { method, url, headers: "Key: Value\n...", body: string }
 * 戻り値: { status: "ok" | "input" | "unsupported" | "secret", response?, flow: [{ step, result, ok }], problems: [], call }
 */
export function sendRequest(session, req) {
  const env = session.env;
  const flow = [], problems = [];
  const done = (r) => { session.history.push(r); return r; };
  const all = `${req.url}\n${req.headers}\n${req.body}`;
  if (looksLikeSecret(all)) return done({ status: "secret", problems: ["本物の AWS 認証情報(アクセスキー ID・シークレットアクセスキー)らしい文字列が含まれています。この学習用環境には入力しないでください。署名は「模擬署名」ボタンで付けられます。"], flow, req });
  const method = String(req.method || "").toUpperCase();
  if (!["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(method)) return done({ status: "input", problems: [`HTTP メソッド「${req.method}」は無効です`], flow, req });
  let url;
  try { url = new URL(req.url); } catch { return done({ status: "input", problems: ["URL の形式が正しくありません(https:// から書きます)"], flow, req }); }
  if (url.protocol !== "https:") problems.push("AWS の API エンドポイントは HTTPS で呼び出します(http:// は使いません)");
  const { headers, errors } = parseHeaders(req.headers);
  if (errors.length) return done({ status: "input", problems: errors, flow, req });
  const host = url.hostname;
  const ctx = { env, method, url, headers, body: req.body || "", flow, problems, req };
  let response;
  try {
    const apiHost = Object.values(env.apis || {}).find((a) => a.host === host);
    if (apiHost) response = apiGateway(ctx, apiHost);
    else if (/^dynamodb\.[a-z0-9-]+\.amazonaws\.com$/.test(host)) response = dynamo(ctx);
    else if (/^lambda\.[a-z0-9-]+\.amazonaws\.com$/.test(host)) response = lambdaApi(ctx);
    else if (/^[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(host)) response = s3Rest(ctx);
    else return done({ status: "unsupported", problems: [`ホスト「${host}」は模擬環境にありません`, `この問題で使えるホスト: ${[...Object.values(env.apis || {}).map((a) => a.host), ...(env.apiHosts || [])].join(", ")}`], flow, req });
  } catch (e) {
    if (e instanceof Unsup) return done({ status: "unsupported", problems: [e.message], flow, req });
    throw e;
  }
  return done({ status: "ok", response, flow, problems, req, call: ctx.call });
}
class Unsup extends Error {}

/* ---------- 模擬 SigV4 ---------- */
function sigv4(ctx, service) {
  const a = ctx.headers.authorization;
  if (!a) { ctx.flow.push({ step: "署名(SigV4)", result: "Authorization ヘッダーが無い", ok: false }); return { error: "missing" }; }
  const m = /^AWS4-HMAC-SHA256\s+Credential=([^/\s,]+)\/(\d{8})\/([a-z0-9-]+)\/([a-z0-9-]+)\/aws4_request,\s*SignedHeaders=([^,\s]+),\s*Signature=(\S+)$/.exec(a);
  if (!m) { ctx.flow.push({ step: "署名(SigV4)", result: "Authorization ヘッダーの形式が SigV4 ではない", ok: false }); return { error: "format" }; }
  const [, cred, , region, svc, signed] = m;
  if (!ctx.headers["x-amz-date"] && !ctx.headers.date) { ctx.flow.push({ step: "署名(SigV4)", result: "X-Amz-Date ヘッダーが無い", ok: false }); return { error: "date" }; }
  if (svc !== service) { ctx.flow.push({ step: "署名(SigV4)", result: `資格情報のスコープが「${svc}」で、呼び出し先「${service}」と違う`, ok: false }); return { error: "scope", svc }; }
  const hostRegion = /\.([a-z0-9-]+)\.amazonaws\.com$/.exec(ctx.url.hostname)?.[1];
  if (hostRegion && region !== hostRegion) { ctx.flow.push({ step: "署名(SigV4)", result: `資格情報のリージョン「${region}」がエンドポイント「${hostRegion}」と違う`, ok: false }); return { error: "region", region, hostRegion }; }
  if (!signed.split(";").includes("host")) { ctx.flow.push({ step: "署名(SigV4)", result: "SignedHeaders に host が含まれていない", ok: false }); return { error: "signed" }; }
  const who = /^SIMULATED-(.+)$/.exec(cred)?.[1];
  const principal = who && ctx.env.signers?.[who];
  if (!principal) { ctx.flow.push({ step: "署名(SigV4)", result: `不明な資格情報「${cred}」`, ok: false }); return { error: "unknown" }; }
  ctx.flow.push({ step: "署名(SigV4)", result: `模擬署名を確認: ${who}(実際の署名計算は行わない)`, ok: true });
  return { principal, who };
}
function sigErrorJson(sig, service) {
  if (sig.error === "missing") return json(400, { __type: "MissingAuthenticationTokenException", message: "Request is missing Authentication Token" });
  if (sig.error === "date") return json(400, { __type: "IncompleteSignatureException", message: "Authorization header requires existence of either a 'X-Amz-Date' or a 'Date' header." });
  if (sig.error === "scope") return json(400, { __type: "InvalidSignatureException", message: `Credential should be scoped to correct service: '${service}'.` });
  if (sig.error === "region") return json(400, { __type: "InvalidSignatureException", message: `Credential should be scoped to a valid region. (expected '${sig.hostRegion}')` });
  if (sig.error === "unknown") return json(403, { __type: "UnrecognizedClientException", message: "The security token included in the request is invalid." });
  return json(400, { __type: "IncompleteSignatureException", message: "Authorization header requires 'Credential', 'SignedHeaders' and 'Signature' parameters." });
}
function authz(ctx, principal, action, resource, extra = {}) {
  const r = evaluate({ principal, action, resource, context: { "aws:SecureTransport": String(ctx.url.protocol === "https:"), "aws:SourceIp": ctx.env.sourceIp || "203.0.113.10", ...extra } }, ctx.env.policies || []);
  ctx.flow.push({ step: `IAM の認可(${action})`, result: `${r.decision === "allow" ? "許可" : r.decision === "unsupported" ? "判定対象外" : "拒否"}: ${r.reason}`, ok: r.decision === "allow", trace: r.trace });
  if (r.decision === "unsupported") throw new Unsup(r.reason);
  return r;
}

/* ---------- API Gateway(REST API) ---------- */
function apiGateway(ctx, api) {
  const { url, method, headers, flow } = ctx;
  flow.push({ step: "API Gateway", result: `${api.name}(ステージ ${api.stage})に到達`, ok: true });
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== api.stage) {
    flow.push({ step: "ステージ", result: `パスの先頭「/${parts[0] || ""}」がステージ名「/${api.stage}」と違う`, ok: false });
    return json(403, { message: "Missing Authentication Token" });
  }
  const path = "/" + parts.slice(1).join("/");
  // CORS のプリフライト
  if (method === "OPTIONS" && api.cors) { flow.push({ step: "CORS", result: "プリフライトに応答", ok: true }); return { status: 204, statusText: "No Content", headers: { "access-control-allow-origin": api.cors, "access-control-allow-methods": [...new Set(api.routes.map((r) => r.method))].join(","), "access-control-allow-headers": "Content-Type,Authorization,x-api-key" }, body: "", data: null }; }
  const params = {};
  const samePath = api.routes.filter((r) => matchPath(r.path, path, {}));
  const route = samePath.find((r) => r.method === method && matchPath(r.path, path, params));
  if (!route) {
    flow.push({ step: "ルート", result: samePath.length ? `パス ${path} はあるが ${method} メソッドが無い(使えるのは ${samePath.map((r) => r.method).join(", ")})` : `リソース ${path} が無い`, ok: false });
    // REST API は未定義のリソース・メソッドに 403 Missing Authentication Token を返す
    return json(403, { message: "Missing Authentication Token" });
  }
  ctx.call = { kind: "apigw", route: `${route.method} ${route.path}`, params };
  flow.push({ step: "ルート", result: `${route.method} ${route.path} に一致${Object.keys(params).length ? `(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(", ")})` : ""}`, ok: true });
  // 認可
  let claims = null;
  if (route.auth === "cognito") {
    const h = headers.authorization;
    if (!h) { flow.push({ step: "Cognito オーソライザー", result: "Authorization ヘッダーが無い", ok: false }); return json(401, { message: "Unauthorized" }); }
    const tok = h.replace(/^Bearer\s+/i, "");
    const t = ctx.env.tokens?.[tok];
    if (!t) { flow.push({ step: "Cognito オーソライザー", result: "トークンを検証できない(署名・発行元が不正)", ok: false }); return json(401, { message: "Unauthorized" }); }
    if (t.expired) { flow.push({ step: "Cognito オーソライザー", result: "トークンの有効期限切れ", ok: false }); return json(401, { message: "The incoming token has expired" }); }
    if (route.scopes && !route.scopes.some((s) => (t.scopes || []).includes(s))) { flow.push({ step: "Cognito オーソライザー", result: `必要なスコープ(${route.scopes.join(", ")})がトークンに無い`, ok: false }); return json(403, { message: "Unauthorized" }); }
    flow.push({ step: "Cognito オーソライザー", result: `トークンを検証: sub=${t.sub}${t.groups ? `、グループ=${t.groups.join(",")}` : ""}`, ok: true });
    claims = t;
  } else if (route.auth === "iam") {
    const sig = sigv4(ctx, "execute-api");
    if (sig.error) return json(403, { message: sig.error === "missing" ? "Missing Authentication Token" : "The request signature we calculated does not match the signature you provided." });
    const arn = `arn:aws:execute-api:${api.region}:${ctx.env.account}:${api.id}/${api.stage}/${method}${path}`;
    const r = authz(ctx, sig.principal, "execute-api:Invoke", arn);
    if (r.decision !== "allow") return json(403, { Message: `User: ${principalArn(sig.principal)} is not authorized to perform: execute-api:Invoke on resource: ${arn}` });
  } else flow.push({ step: "認可", result: "このメソッドは認可なし(NONE)", ok: true });
  if (route.apiKey) {
    const k = headers["x-api-key"];
    const plan = k && ctx.env.apiKeys?.[k];
    if (!plan) { flow.push({ step: "API キー", result: k ? "未登録のキー" : "x-api-key ヘッダーが無い", ok: false }); return json(403, { message: "Forbidden" }); }
    if (plan.throttled) { flow.push({ step: "使用量プラン", result: `プラン「${plan.plan}」のクォータ・スロットリングを超過`, ok: false }); return json(429, { message: "Too Many Requests" }); }
    flow.push({ step: "API キー", result: `キーを確認(使用量プラン ${plan.plan})`, ok: true });
  }
  // リクエストの検証(本文のモデル)
  let body = null;
  if (route.validate) {
    const ct = (headers["content-type"] || "").split(";")[0].trim();
    if (ct !== "application/json") { flow.push({ step: "リクエストの検証", result: `Content-Type が application/json ではない(「${ct || "なし"}」)`, ok: false }); return json(415, { message: "Unsupported Media Type" }); }
    try { body = parseJson(ctx.body).value; }
    catch (e) { flow.push({ step: "リクエストの検証", result: `本文が JSON として読めない(${e.line} 行 ${e.col} 列: ${e.message})`, ok: false }); return json(400, { message: "Invalid request body" }); }
    const errs = checkModel(body, route.validate);
    if (errs.length) { flow.push({ step: "リクエストの検証", result: errs.join(" / "), ok: false }); return json(400, { message: "Invalid request body" }); }
    flow.push({ step: "リクエストの検証", result: "モデルに合致", ok: true });
  } else if (ctx.body.trim()) {
    try { body = parseJson(ctx.body).value; } catch { body = ctx.body; }
  }
  if (route.requireQuery) for (const q of route.requireQuery) if (!url.searchParams.has(q)) { flow.push({ step: "リクエストの検証", result: `クエリ文字列 ${q} が必要`, ok: false }); return json(400, { message: `Missing required request parameters: [${q}]` }); }
  // 統合(Lambda プロキシ)
  flow.push({ step: "統合", result: `Lambda「${route.lambda}」をプロキシ統合で呼び出し`, ok: true });
  const res = handlers[route.handler](ctx, { params, body, claims, query: Object.fromEntries(url.searchParams), table: route.table });
  flow.push({ step: "Lambda の応答", result: `statusCode ${res.status}`, ok: res.status < 400 });
  if (api.cors && headers.origin) res.headers["access-control-allow-origin"] = api.cors;
  return res;
}
function matchPath(pattern, path, params) {
  const p = pattern.split("/").filter(Boolean), a = path.split("/").filter(Boolean);
  if (p.length !== a.length) return false;
  for (let i = 0; i < p.length; i++) {
    const m = /^\{(.+)\}$/.exec(p[i]);
    if (m) params[m[1]] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return false;
  }
  return true;
}
function checkModel(body, model) {
  const errs = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) return ["本文は JSON のオブジェクトにします"];
  for (const k of model.required || []) if (!(k in body)) errs.push(`必須の項目 ${k} が無い`);
  for (const [k, t] of Object.entries(model.types || {})) if (k in body) {
    const v = body[k];
    const ok = t === "integer" ? Number.isInteger(v) : t === "array" ? Array.isArray(v) : typeof v === t;
    if (!ok) errs.push(`${k} は ${t} 型にします(実際は ${Array.isArray(v) ? "array" : typeof v})`);
  }
  for (const [k, r] of Object.entries(model.min || {})) if (typeof body[k] === "number" && body[k] < r) errs.push(`${k} は ${r} 以上にします`);
  return errs;
}
const handlers = {
  getItem(ctx, { params, table }) {
    const t = ctx.env.dynamodb.tables[table];
    const item = t.items.find((x) => x[t.key] === params.id);
    if (!item) return json(404, { message: `item ${params.id} は存在しません` });
    return json(200, item);
  },
  listItems(ctx, { query, table }) {
    const t = ctx.env.dynamodb.tables[table];
    let items = t.items;
    if (query.category) items = items.filter((x) => x.category === query.category);
    return json(200, { items, count: items.length });
  },
  createItem(ctx, { body, claims, table }) {
    const t = ctx.env.dynamodb.tables[table];
    const id = body.id || `item-${t.items.length + 1}`;
    if (t.items.some((x) => x[t.key] === id)) return json(409, { message: `item ${id} は既に存在します` });
    const item = { [t.key]: id, ...body, ...(claims ? { owner: claims.sub } : {}) };
    t.items.push(item);
    ctx.call.created = item;
    return json(201, item, { location: `/${id}` });
  },
  deleteOwnItem(ctx, { params, claims, table }) {
    const t = ctx.env.dynamodb.tables[table];
    const i = t.items.findIndex((x) => x[t.key] === params.id);
    if (i < 0) return json(404, { message: `item ${params.id} は存在しません` });
    if (!claims?.groups?.includes("admin") && t.items[i].owner !== claims?.sub) return json(403, { message: "自分が作成した項目だけ削除できます" });
    ctx.call.deleted = t.items[i];
    t.items.splice(i, 1);
    return { status: 204, statusText: "No Content", headers: {}, body: "", data: null };
  },
};

/* ---------- DynamoDB(JSON 1.0 プロトコル) ---------- */
const ATTR = { S: "string", N: "number-string", BOOL: "boolean", L: "array", M: "object", NULL: "boolean", SS: "array", NS: "array" };
function dynamo(ctx) {
  const { headers, env, flow } = ctx;
  if (ctx.method !== "POST") { flow.push({ step: "DynamoDB", result: "DynamoDB の API は POST / で呼び出す", ok: false }); return json(400, { __type: "com.amazon.coral.service#UnknownOperationException", message: "" }); }
  const target = headers["x-amz-target"] || "";
  const m = /^DynamoDB_20120810\.([A-Za-z]+)$/.exec(target);
  if (!m) { flow.push({ step: "DynamoDB", result: target ? `X-Amz-Target「${target}」が正しくない(DynamoDB_20120810.操作名)` : "X-Amz-Target ヘッダーが無い(操作名を指定するヘッダー)", ok: false }); return json(400, { __type: "com.amazon.coral.service#UnknownOperationException", message: "" }); }
  const op = m[1];
  if ((headers["content-type"] || "") !== "application/x-amz-json-1.0") flow.push({ step: "Content-Type", result: `「${headers["content-type"] || "なし"}」(DynamoDB は application/x-amz-json-1.0)`, ok: false });
  const sig = sigv4(ctx, "dynamodb");
  if (sig.error) return sigErrorJson(sig, "dynamodb");
  if (!["GetItem", "PutItem", "Query", "DeleteItem"].includes(op)) throw new Unsup(`DynamoDB の ${op} は学習用環境では未対応です(GetItem / PutItem / Query / DeleteItem)`);
  let body;
  try { body = parseJson(ctx.body).value; }
  catch (e) { flow.push({ step: "本文", result: `JSON として読めない(${e.line} 行 ${e.col} 列)`, ok: false }); return json(400, { __type: "com.amazon.coral.service#SerializationException", message: "Start of structure or map found where not expected." }); }
  const tableName = body?.TableName;
  if (!tableName) return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: "1 validation error detected: Value null at 'tableName' failed to satisfy constraint: Member must not be null" });
  const region = /^dynamodb\.([a-z0-9-]+)\./.exec(ctx.url.hostname)[1];
  const arn = `arn:aws:dynamodb:${region}:${env.account}:table/${tableName}`;
  ctx.call = { kind: "dynamodb", op, table: tableName, principal: sig.who };
  const keyVals = op === "Query" ? leadingKeys(body) : body.Key ? [unwrap(body.Key[Object.keys(body.Key)[0]])] : body.Item ? [unwrap(body.Item[env.dynamodb.tables[tableName]?.key])] : [];
  const r = authz(ctx, sig.principal, `dynamodb:${op}`, arn, keyVals.length ? { "dynamodb:LeadingKeys": keyVals.map(String) } : {});
  if (r.decision !== "allow") return json(400, { __type: "com.amazon.coral.service#AccessDeniedException", Message: `User: ${principalArn(sig.principal)} is not authorized to perform: dynamodb:${op} on resource: ${arn} ${r.decision === "explicit-deny" ? "with an explicit deny in an identity-based policy" : "because no identity-based policy allows the dynamodb:" + op + " action"}` });
  const t = env.dynamodb?.tables?.[tableName];
  if (!t || (t.region || env.region) !== region) { flow.push({ step: "テーブル", result: `${tableName} が ${region} に無い`, ok: false }); return json(400, { __type: "com.amazonaws.dynamodb.v20120810#ResourceNotFoundException", message: "Requested resource not found" }); }
  const typeErr = (av, where) => {
    if (!av || typeof av !== "object" || Array.isArray(av)) return `${where} は {"S": "値"} のような型付きの形にします`;
    const ks = Object.keys(av);
    if (ks.length !== 1 || !ATTR[ks[0]]) return `${where} の型「${ks.join(",")}」は無効です(S / N / BOOL / L / M など)`;
    if (ks[0] === "N" && (typeof av.N !== "string" || Number.isNaN(Number(av.N)))) return `${where} の N(数値)は "42" のように文字列で書きます`;
    if (ks[0] === "S" && typeof av.S !== "string") return `${where} の S は文字列にします`;
    return null;
  };
  if (op === "GetItem" || op === "DeleteItem") {
    const ks = Object.keys(body.Key || {});
    if (ks.length !== 1 || ks[0] !== t.key) { flow.push({ step: "キー", result: `キーは ${t.key}(${t.keyType})だけを指定する(指定: ${ks.join(", ") || "なし"})`, ok: false }); return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: "The provided key element does not match the schema" }); }
    const e = typeErr(body.Key[t.key], `Key.${t.key}`);
    if (e || Object.keys(body.Key[t.key])[0] !== t.keyType) { flow.push({ step: "キー", result: e || `${t.key} の型は ${t.keyType}`, ok: false }); return json(400, { __type: e ? "com.amazon.coral.service#SerializationException" : "com.amazon.coral.validate#ValidationException", message: e ? "Unexpected value type in payload" : "The provided key element does not match the schema" }); }
    const id = unwrap(body.Key[t.key]);
    const i = t.items.findIndex((x) => String(x[t.key]) === String(id));
    flow.push({ step: op, result: i < 0 ? "該当する項目なし" : "項目を取得", ok: true });
    if (op === "DeleteItem") { if (i >= 0) { ctx.call.deleted = t.items[i]; t.items.splice(i, 1); } return json(200, {}); }
    return json(200, i < 0 ? {} : { Item: wrap(t.items[i]) });
  }
  if (op === "PutItem") {
    const item = body.Item || {};
    for (const [k, v] of Object.entries(item)) { const e = typeErr(v, `Item.${k}`); if (e) { flow.push({ step: "項目", result: e, ok: false }); return json(400, { __type: "com.amazon.coral.service#SerializationException", message: "Unexpected value type in payload" }); } }
    if (!(t.key in item) || Object.keys(item[t.key])[0] !== t.keyType) { flow.push({ step: "項目", result: `パーティションキー ${t.key}(${t.keyType})が必要`, ok: false }); return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: "One or more parameter values were invalid: Missing the key " + t.key + " in the item" }); }
    const plain = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, unwrap(v)]));
    if (body.ConditionExpression) {
      if (body.ConditionExpression.replace(/\s+/g, " ").trim() !== `attribute_not_exists(${t.key})`) throw new Unsup("この環境の ConditionExpression は attribute_not_exists(キー) だけに対応しています");
      if (t.items.some((x) => String(x[t.key]) === String(plain[t.key]))) { flow.push({ step: "条件付き書き込み", result: "同じキーの項目が既にある", ok: false }); return json(400, { __type: "com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException", message: "The conditional request failed" }); }
    }
    const i = t.items.findIndex((x) => String(x[t.key]) === String(plain[t.key]));
    if (i >= 0) t.items[i] = plain; else t.items.push(plain);
    ctx.call.put = plain;
    flow.push({ step: "PutItem", result: i >= 0 ? "既存の項目を上書き" : "項目を作成", ok: true });
    return json(200, {});
  }
  // Query: KeyConditionExpression は「キー = :値」だけに対応
  const kce = (body.KeyConditionExpression || "").replace(/\s+/g, " ").trim();
  const km = /^#?([A-Za-z0-9_]+) = (:[A-Za-z0-9_]+)$/.exec(kce);
  if (!km) { if (!kce) return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: "Either the KeyConditions or KeyConditionExpression parameter must be specified in the request." }); throw new Unsup("この環境の KeyConditionExpression は「キー = :値」の形だけに対応しています"); }
  const name = kce.startsWith("#") ? body.ExpressionAttributeNames?.["#" + km[1]] : km[1];
  const av = body.ExpressionAttributeValues?.[km[2]];
  if (!av) return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: `Invalid KeyConditionExpression: An expression attribute value used in expression is not defined; attribute value: ${km[2]}` });
  const e = typeErr(av, km[2]);
  if (e) return json(400, { __type: "com.amazon.coral.service#SerializationException", message: "Unexpected value type in payload" });
  const index = body.IndexName ? t.indexes?.[body.IndexName] : null;
  if (body.IndexName && !index) return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: "The table does not have the specified index: " + body.IndexName });
  const keyName = index ? index.key : t.key;
  if (name !== keyName) { flow.push({ step: "Query", result: `Query の条件にはパーティションキー ${keyName} を使う(指定: ${name})`, ok: false }); return json(400, { __type: "com.amazon.coral.validate#ValidationException", message: "Query condition missed key schema element: " + keyName }); }
  const items = t.items.filter((x) => String(x[keyName]) === String(unwrap(av)));
  flow.push({ step: "Query", result: `${items.length} 件${index ? `(インデックス ${body.IndexName})` : ""}`, ok: true });
  return json(200, { Items: items.map(wrap), Count: items.length, ScannedCount: items.length });
}
function leadingKeys(body) {
  const v = Object.values(body.ExpressionAttributeValues || {})[0];
  return v ? [unwrap(v)] : [];
}
function unwrap(av) {
  if (!av || typeof av !== "object") return av;
  const [t, v] = Object.entries(av)[0] || [];
  if (t === "N") return Number(v);
  if (t === "L") return v.map(unwrap);
  if (t === "M") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unwrap(x)]));
  if (t === "NULL") return null;
  return v;
}
function wrap(item) {
  const w = (v) => (v === null ? { NULL: true } : typeof v === "number" ? { N: String(v) } : typeof v === "boolean" ? { BOOL: v } : Array.isArray(v) ? { L: v.map(w) } : typeof v === "object" ? { M: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, w(x)])) } : { S: String(v) });
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, w(v)]));
}
function principalArn(p) { return p.kind === "iam-role" ? `arn:aws:sts::${p.account}:assumed-role/${p.name}/${p.session || "session"}` : `arn:aws:iam::${p.account}:user/${p.name}`; }

/* ---------- Lambda Invoke API ---------- */
function lambdaApi(ctx) {
  const { url, flow, env } = ctx;
  const m = /^\/2015-03-31\/functions\/([^/]+)\/invocations$/.exec(url.pathname);
  if (!m) throw new Unsup("Lambda の API はこの環境では Invoke(POST /2015-03-31/functions/<名前>/invocations)だけに対応しています");
  if (ctx.method !== "POST") { flow.push({ step: "Lambda", result: "Invoke は POST で呼び出す", ok: false }); return json(405, { message: "Method Not Allowed" }); }
  const sig = sigv4(ctx, "lambda");
  if (sig.error) return sigErrorJson(sig, "lambda");
  const name = decodeURIComponent(m[1]);
  const region = /^lambda\.([a-z0-9-]+)\./.exec(url.hostname)[1];
  const arn = `arn:aws:lambda:${region}:${env.account}:function:${name}`;
  ctx.call = { kind: "lambda", fn: name, principal: sig.who, type: ctx.headers["x-amz-invocation-type"] || "RequestResponse" };
  const r = authz(ctx, sig.principal, "lambda:InvokeFunction", arn);
  if (r.decision !== "allow") return json(403, { Type: "User", message: `User: ${principalArn(sig.principal)} is not authorized to perform: lambda:InvokeFunction on resource: ${arn} because no identity-based policy allows the lambda:InvokeFunction action` });
  const f = env.lambda?.functions?.[name];
  if (!f) return json(404, { Type: "User", message: `Function not found: ${arn}` });
  let event;
  try { event = ctx.body.trim() ? parseJson(ctx.body).value : {}; } catch { flow.push({ step: "ペイロード", result: "JSON として読めない", ok: false }); return json(400, { Type: "User", message: "Could not parse request body into json: Could not parse payload into json" }); }
  const type = ctx.headers["x-amz-invocation-type"] || "RequestResponse";
  if (type === "Event") { flow.push({ step: "呼び出し", result: "非同期(Event): キューに入れて 202 を返す", ok: true }); return { status: 202, statusText: "Accepted", headers: {}, body: "", data: null }; }
  if (type !== "RequestResponse" && type !== "DryRun") return json(400, { Type: "User", message: "1 validation error detected: Value at 'invocationType' failed to satisfy constraint" });
  if (type === "DryRun") { flow.push({ step: "呼び出し", result: "DryRun: 権限とパラメーターだけを確認", ok: true }); return { status: 204, statusText: "No Content", headers: {}, body: "", data: null }; }
  const res = f.behavior === "order-total" ? (() => { const items = Array.isArray(event.items) ? event.items : null; if (!items) return { error: true, body: { errorType: "ValidationError", errorMessage: "items は配列で指定してください" } }; return { body: { orderId: event.orderId ?? null, total: items.reduce((a, it) => a + Number(it.price || 0) * Number(it.qty || 1), 0), currency: "JPY" } }; })() : { body: { received: event } };
  flow.push({ step: "呼び出し", result: res.error ? "関数がエラーを返した(HTTP は 200、X-Amz-Function-Error で通知)" : "同期(RequestResponse)で結果を受け取る", ok: !res.error });
  ctx.call.result = res.body;
  return json(200, res.body, { "x-amz-executed-version": "$LATEST", ...(res.error ? { "x-amz-function-error": "Unhandled" } : {}) });
}

/* ---------- S3 REST ---------- */
function s3Rest(ctx) {
  const { url, flow, env, method } = ctx;
  const bucket = url.hostname.split(".s3.")[0];
  const key = decodeURIComponent(url.pathname.slice(1));
  const b = env.s3?.buckets?.[bucket];
  if (!["GET", "PUT", "DELETE"].includes(method) || !key) throw new Unsup("S3 の REST API はこの環境ではオブジェクトの GET / PUT / DELETE だけに対応しています");
  const sig = ctx.headers.authorization ? sigv4(ctx, "s3") : null;
  if (sig?.error) return xml(400, sig.error === "scope" ? "AuthorizationHeaderMalformed" : "SignatureDoesNotMatch", sig.error === "scope" ? `The authorization header is malformed; incorrect service "${sig.svc}". This endpoint belongs to "s3".` : "The request signature we calculated does not match the signature you provided.");
  const principal = sig ? sig.principal : { kind: "anonymous" };
  if (!sig) flow.push({ step: "署名(SigV4)", result: "署名なし: 匿名のリクエストとして扱う", ok: true });
  if (!b) return xml(404, "NoSuchBucket", "The specified bucket does not exist");
  const action = { GET: "s3:GetObject", PUT: "s3:PutObject", DELETE: "s3:DeleteObject" }[method];
  const extra = {};
  if (ctx.headers["x-amz-server-side-encryption"]) extra["s3:x-amz-server-side-encryption"] = ctx.headers["x-amz-server-side-encryption"];
  const policies = [...(env.policies || [])];
  if (b.policy) policies.push({ kind: "resource", name: `${bucket} のバケットポリシー`, doc: b.policy, account: b.owner || env.account });
  const r = evaluate({ principal, action, resource: `arn:aws:s3:::${bucket}/${key}`, resourceAccount: b.owner || env.account, context: { "aws:SecureTransport": String(url.protocol === "https:"), "aws:SourceIp": env.sourceIp || "203.0.113.10", ...extra } }, policies);
  flow.push({ step: `IAM の認可(${action})`, result: `${r.decision === "allow" ? "許可" : r.decision === "unsupported" ? "判定対象外" : "拒否"}: ${r.reason}`, ok: r.decision === "allow", trace: r.trace });
  if (r.decision === "unsupported") throw new Unsup(r.reason);
  ctx.call = { kind: "s3", method, bucket, key, principal: sig?.who || "anonymous", sse: extra["s3:x-amz-server-side-encryption"] };
  if (r.decision !== "allow") return xml(403, "AccessDenied", "Access Denied");
  if (method === "GET") {
    const o = b.objects[key];
    if (!o) return xml(404, "NoSuchKey", "The specified key does not exist.", `\n  <Key>${key}</Key>`);
    return { status: 200, statusText: "OK", headers: { "content-type": o.type || "application/octet-stream", "content-length": String(o.size), "x-amz-server-side-encryption": o.sse || "AES256" }, body: o.body || `(${o.size} バイトのデータ)`, data: null };
  }
  if (method === "DELETE") { delete b.objects[key]; return { status: 204, statusText: "No Content", headers: {}, body: "", data: null }; }
  b.objects[key] = { size: ctx.body.length, modified: env.now || "2026-11-08T06:00:00Z", sse: extra["s3:x-amz-server-side-encryption"] || "AES256", body: ctx.body };
  ctx.call.put = true;
  return { status: 200, statusText: "OK", headers: { etag: '"simulated"', "x-amz-server-side-encryption": extra["s3:x-amz-server-side-encryption"] || "AES256" }, body: "", data: null };
}

/** 模擬署名のヘッダーを作る(UI の「模擬署名を付ける」ボタン用) */
export function simulatedSignature(who, service, region, date = "20261108") {
  return `Authorization: AWS4-HMAC-SHA256 Credential=SIMULATED-${who}/${date}/${region}/${service}/aws4_request, SignedHeaders=host;x-amz-date, Signature=simulated-not-a-real-signature\nX-Amz-Date: ${date}T060000Z`;
}
