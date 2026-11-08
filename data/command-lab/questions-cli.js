// コマンド・ポリシー演習: AWS CLI(10 問)。目標(goals)は、実行したコマンドの結果と模擬環境の状態で判定する。
// オプションの順序・引用符の違いは問わない。同じ結果になる別の書き方(別解)も正解にする。
import { cliEnv } from "./environments.js";

const ok = (s, svc, op) => s.history.filter((r) => r.status === "ok" && r.call?.service === svc && r.call?.op === op);
const flat = (v) => (Array.isArray(v) ? v.flat(Infinity) : [v]);
const sameSet = (a, b) => a.length === b.length && b.every((x) => a.includes(x));
const cliRef = (path, title) => ({ title, url: `https://docs.aws.amazon.com/cli/latest/reference/${path}.html` });
const QUERY = { title: "AWS CLI の出力のフィルター(--query)", url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html" };
const RUNNING = ["i-0a1b2c3d4e5f60001", "i-0a1b2c3d4e5f60002", "i-0a1b2c3d4e5f60003"];

export const CLI_QUESTIONS = [
  {
    id: "cli-sts-001", category: "cli", mode: "write", level: 1, examTags: ["CLF", "SOA", "DVA"], services: ["sts", "iam"],
    title: "今の自分は誰? アカウント ID だけを表示する",
    scenario: "作業の前に、AWS CLI がどの ID(どのアカウント)で動いているかを確かめます。呼び出し元の情報を取得し、アカウント ID だけをテキストで表示してください。",
    environment: ["呼び出し元: IAM ユーザー alice(アカウント 111122223333)", "認証情報やプロファイルの入力は不要です(模擬環境で設定済み)"],
    requirements: ["呼び出し元の情報を取得する操作を使う", "出力はアカウント ID の文字列だけ(引用符や JSON の記号なし)"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "sts get-caller-identity を実行して成功した", test: (s) => ok(s, "sts", "get-caller-identity").length > 0 },
      { label: "アカウント ID だけが表示された(111122223333)", test: (s) => ok(s, "sts", "get-caller-identity").some((r) => r.stdout.trim() === "111122223333") },
    ],
    hints: ["呼び出し元の確認は aws sts get-caller-identity です。この操作は IAM の許可が無くても実行できます。", "--query Account で Account の値だけを取り出せます。", "--output text を付けると、JSON の引用符なしで表示されます。"],
    model: "aws sts get-caller-identity --query Account --output text",
    explain: {
      point: "get-caller-identity は、署名に使った認証情報の持ち主(UserId・Account・Arn)を返します。AccessDenied の調査では、まず「誰として呼んでいるか」を確かめるのが定石です。--query は JMESPath で出力を絞り、--output text は値をそのまま表示します。",
      compare: "--output json(既定)のままだと \"111122223333\" のように引用符付きになります。シェルスクリプトで変数に入れるときは text が便利です。",
      pitfalls: ["--query 'Account' の大文字・小文字を間違える(キーは大文字・小文字を区別)", "aws iam get-user を使う → IAM の許可が必要で、ロールでは使えない"],
    },
    references: [cliRef("sts/get-caller-identity", "aws sts get-caller-identity"), QUERY], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-s3ls-002", category: "cli", mode: "write", level: 1, examTags: ["CLF", "SAA", "SOA"], services: ["s3"],
    title: "aws s3 ls で自分のプレフィックスを一覧する",
    scenario: "alice は my-bucket のうち users/alice/ 配下だけを一覧できます(iam-s3-003 のポリシー)。users/alice/ の中身を aws s3 ls で表示してください。",
    environment: ["バケット my-bucket", "alice の許可: s3:ListBucket(s3:prefix が users/alice/ または users/alice/* のときだけ)"],
    requirements: ["users/alice/ の直下の一覧(report.pdf・photo.jpg・notes/)を表示する", "バケット全体の一覧は許可されていない"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "aws s3 ls が成功した", test: (s) => ok(s, "s3", "ls").length > 0 },
      { label: "users/alice/ の直下(report.pdf と notes/)が表示された", test: (s) => ok(s, "s3", "ls").some((r) => r.stdout.includes("report.pdf") && r.stdout.includes("PRE notes/")) },
    ],
    hints: ["S3 の URI は s3://バケット名/プレフィックス の形です。", "末尾の / を忘れると、プレフィックスが users/alice になり、許可の条件(users/alice/)に一致しません。", "aws s3 ls s3://my-bucket/users/alice/"],
    model: "aws s3 ls s3://my-bucket/users/alice/",
    explain: {
      point: "aws s3 ls s3://my-bucket/users/alice/ は、ListObjectsV2(prefix=users/alice/、delimiter=/)を呼び出します。許可は s3:ListBucket と s3:prefix 条件で判定されます。直下のプレフィックスは PRE として表示されます。",
      compare: "s3://my-bucket/ を一覧すると prefix が空になり、条件に合わず AccessDenied です。s3://my-bucket/users/alice(末尾 / なし)も、prefix が users/alice となり許可されません。--recursive を付けると delimiter を使わず配下のすべてのキーを表示します。",
      pitfalls: ["バケットの最上位から一覧しようとする", "URI の末尾の / を省略する"],
    },
    references: [cliRef("s3/ls", "aws s3 ls"), { title: "IAM ユーザーの S3 ホームディレクトリ(ポリシー例)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_home-directory-console.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-s3api-003", category: "cli", mode: "write", level: 2, examTags: ["DVA", "SOA"], services: ["s3"],
    title: "list-objects-v2 と --query で、キー名だけの一覧を得る",
    scenario: "スクリプトで処理するため、my-bucket の users/alice/ 配下にあるすべてのオブジェクトのキー名だけを、配列で取得してください(サイズや日時は不要)。低レベル API の aws s3api を使います。",
    environment: ["バケット my-bucket、呼び出し元 alice", "users/alice/ 配下: report.pdf・photo.jpg・notes/todo.txt"],
    requirements: ["aws s3api list-objects-v2 を使う", "users/alice/ 配下のすべてのキー(3 件)を返す", "出力はキー名の配列だけにする"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "list-objects-v2 が成功した", test: (s) => ok(s, "s3api", "list-objects-v2").length > 0 },
      { label: "結果が users/alice/ 配下のキー 3 件だけの配列", test: (s) => ok(s, "s3api", "list-objects-v2").some((r) => Array.isArray(r.result) && sameSet(flat(r.result), ["users/alice/notes/todo.txt", "users/alice/photo.jpg", "users/alice/report.pdf"])) },
    ],
    hints: ["--bucket my-bucket --prefix users/alice/ で範囲を指定します。", "出力の Contents は配列で、各要素に Key があります。", "--query 'Contents[].Key' で Key だけを取り出せます。"],
    model: "aws s3api list-objects-v2 --bucket my-bucket --prefix users/alice/ --query 'Contents[].Key'",
    explain: {
      point: "list-objects-v2 は ListObjectsV2 API をそのまま呼びます。--prefix が s3:prefix 条件キーとして評価されます。--query 'Contents[].Key' は Contents 配列の各要素から Key を取り出す JMESPath です。",
      compare: "--delimiter / を付けると、直下のキーと CommonPrefixes(notes/)に分かれて返るため、配下のすべてのキーにはなりません。--query はクライアント側の絞り込みで、取得するデータ量は減りません(サーバー側で絞るのは --prefix)。",
      pitfalls: ["--prefix を付けない → 許可されず AccessDenied", "--query 'Contents.Key' と書く → 配列の要素に届かず null"],
    },
    references: [cliRef("s3api/list-objects-v2", "aws s3api list-objects-v2"), QUERY], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-ec2-004", category: "cli", mode: "write", level: 2, examTags: ["SOA", "SAA", "DVA"], services: ["ec2"],
    title: "実行中の EC2 のインスタンス ID だけを、テキストで表示",
    scenario: "東京リージョン(ap-northeast-1)で実行中(running)のインスタンスの ID だけを、テキストで表示してください。停止中のインスタンスは含めません。",
    environment: ["リージョン ap-northeast-1: 実行中 3 台・停止中 1 台", "us-east-1 にも 1 台(今回は対象外)"],
    requirements: ["状態が running のインスタンスだけ", "インスタンス ID だけを --output text で表示"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "describe-instances が成功した", test: (s) => ok(s, "ec2", "describe-instances").length > 0 },
      { label: "実行中の 3 台の ID だけを取得した", test: (s) => ok(s, "ec2", "describe-instances").some((r) => r.result !== undefined && sameSet(flat(r.result), RUNNING)) },
      { label: "--output text で表示した", test: (s) => ok(s, "ec2", "describe-instances").some((r) => r.call.global.output === "text" && sameSet(flat(r.result), RUNNING)) },
    ],
    hints: ["サーバー側の絞り込みは --filters Name=instance-state-name,Values=running です。", "インスタンスは Reservations の中の Instances にあります。--query 'Reservations[].Instances[].InstanceId'", "最後に --output text を付けます。"],
    model: "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId' --output text",
    explain: {
      point: "--filters は API に渡すサーバー側のフィルター、--query はクライアント側で出力を加工する JMESPath です。Reservations[] と Instances[] はそれぞれ配列を平らにし(フラット化)、すべてのインスタンスの InstanceId を 1 つの配列にします。",
      compare: "--query の中で Instances[?State.Name=='running'] と書いても同じ ID が得られますが、全件を受け取ってから手元で絞るので、台数が多いとデータ量が増えます。Reservations[*].Instances[*] だと入れ子の配列のままになります。",
      pitfalls: ["--filter(単数)と書く → Unknown options", "Values=Running と大文字で書く → 状態名は小文字の running", "--region を別のリージョンにする → 一覧が空"],
    },
    references: [cliRef("ec2/describe-instances", "aws ec2 describe-instances"), QUERY], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-ec2-005", category: "cli", mode: "fix", level: 2, examTags: ["SOA", "SAA"], services: ["ec2"],
    title: "【障害対応】インスタンスの詳細が取得できない",
    scenario: "同僚から「バッチ用のインスタンス i-0a1b2c3d4e5f60004 の情報を取りたいが、コマンドがエラーになる」と相談されました。同僚のコマンドが入力欄に入っています。原因を直して、このインスタンスの情報を取得してください。",
    environment: ["インスタンス i-0a1b2c3d4e5f60004(batch-dev-1)は東京リージョン ap-northeast-1 にある", "同僚のコマンドは入力欄を参照"],
    requirements: ["i-0a1b2c3d4e5f60004 の情報を describe-instances で取得する"],
    editor: { language: "cli", starter: "aws ec2 describe-instances --region us-east-1 --instance-id i-0a1b2c3d4e5f60004", env: cliEnv() },
    goals: [
      { label: "i-0a1b2c3d4e5f60004 の情報を取得できた", test: (s) => ok(s, "ec2", "describe-instances").some((r) => JSON.stringify(r.result ?? null).includes("i-0a1b2c3d4e5f60004")) },
    ],
    hints: ["まずはそのまま実行して、エラーの内容を読みましょう。", "オプション名は --instance-ids(複数形)です。", "インスタンスは ap-northeast-1 にあります。--region を直すか、既定のリージョンに任せます。"],
    model: "aws ec2 describe-instances --instance-ids i-0a1b2c3d4e5f60004 --region ap-northeast-1",
    explain: {
      point: "エラーは 2 段階です。①--instance-id は存在しないオプション(Unknown options)。②直すと、us-east-1 には無いインスタンスなので InvalidInstanceID.NotFound。EC2 はリージョン単位のサービスで、別リージョンのリソースは見えません。",
      compare: "--filters Name=instance-id,Values=… で探す方法もあります。この場合、見つからなくてもエラーにはならず、空の Reservations が返るだけなので、リージョンの誤りに気付きにくくなります。",
      pitfalls: ["オプション名の単数・複数を取り違える", "リージョンを確認せずに「インスタンスが消えた」と判断する"],
    },
    references: [cliRef("ec2/describe-instances", "aws ec2 describe-instances"), { title: "AWS CLI のリージョンの設定", url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-ec2-006", category: "cli", mode: "exec", level: 3, examTags: ["SOA", "SCS"], services: ["ec2", "iam"],
    title: "dry-run で権限を確かめてから、開発用インスタンスを止める",
    scenario: "負荷テストが終わったので、開発用の web-dev-1(i-0a1b2c3d4e5f60001)を停止します。本番を誤って止めないよう、まず --dry-run で権限と対象を確かめてから停止してください。",
    environment: ["alice は Environment=dev のインスタンスだけを停止・起動できる(iam-ec2tag-007 のポリシー)", "web-dev-1: i-0a1b2c3d4e5f60001(dev)、web-prod-1・web-prod-2(prod)"],
    requirements: ["停止の前に、同じインスタンスに対して --dry-run を実行する", "web-dev-1 を停止(stopped)する", "本番のインスタンスは実行中のまま"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "停止の前に --dry-run で確認した(DryRunOperation)", test: (s) => { const i = s.history.findIndex((r) => r.call?.op === "stop-instances" && r.code === "DryRunOperation" && r.call.opts["instance-ids"].includes("i-0a1b2c3d4e5f60001")); const j = s.history.findIndex((r) => r.call?.op === "stop-instances" && r.status === "ok"); return i >= 0 && (j < 0 || i < j); } },
      { label: "web-dev-1 が停止した", test: (s) => s.env.ec2.instances.find((i) => i.InstanceId === "i-0a1b2c3d4e5f60001").State.Name === "stopped" },
      { label: "本番のインスタンスは実行中のまま", test: (s) => ["i-0a1b2c3d4e5f60002", "i-0a1b2c3d4e5f60003"].every((id) => s.env.ec2.instances.find((i) => i.InstanceId === id).State.Name === "running") },
    ],
    hints: ["aws ec2 stop-instances --instance-ids <ID> --dry-run を実行します。", "成功の見込みがあると DryRunOperation、権限が無いと UnauthorizedOperation が返ります。どちらもエラーの形で返るのが dry-run の仕様です。", "確認できたら --dry-run を外して実行します。"],
    model: "aws ec2 stop-instances --instance-ids i-0a1b2c3d4e5f60001 --dry-run\naws ec2 stop-instances --instance-ids i-0a1b2c3d4e5f60001",
    explain: {
      point: "EC2 の多くの操作は --dry-run に対応し、実際には実行せずに権限とパラメーターだけを確認します。許可されていれば DryRunOperation、許可が無ければ UnauthorizedOperation のエラーが返ります。alice の許可はタグ Environment=dev が条件なので、本番のインスタンスを指定すると UnauthorizedOperation になります。",
      compare: "IAM の権限を事前に確かめる方法には、IAM Policy Simulator や aws iam simulate-principal-policy もあります。dry-run は実際の API と同じ認可の経路で確認できる点が利点です。",
      pitfalls: ["DryRunOperation を「失敗」と読み違える", "--instance-ids に本番の ID を混ぜる"],
    },
    references: [cliRef("ec2/stop-instances", "aws ec2 stop-instances"), { title: "タグによる AWS リソースへのアクセス制御", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-cw-007", category: "cli", mode: "write", level: 2, examTags: ["SOA", "DOP"], services: ["cloudwatch"],
    title: "アラーム状態の CloudWatch アラームの名前を一覧",
    scenario: "障害対応の最初に、いま ALARM 状態になっている CloudWatch アラームの名前だけを一覧にしてください。状態の絞り込みはサーバー側で行います。",
    environment: ["アラーム 4 件(ALARM 2・OK 1・INSUFFICIENT_DATA 1)"],
    requirements: ["状態が ALARM のものだけを、API のパラメーターで絞り込む", "アラーム名だけを出力する"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "--state-value ALARM で絞り込んだ", test: (s) => ok(s, "cloudwatch", "describe-alarms").some((r) => r.call.opts["state-value"] === "ALARM") },
      { label: "ALARM 状態のアラーム名だけを出力した", test: (s) => ok(s, "cloudwatch", "describe-alarms").some((r) => r.call.opts["state-value"] === "ALARM" && Array.isArray(r.result) && sameSet(flat(r.result), ["web-dev-1-cpu-high", "orders-5xx-rate"])) },
    ],
    hints: ["aws cloudwatch describe-alarms --state-value ALARM", "結果は MetricAlarms 配列です。", "--query 'MetricAlarms[].AlarmName'"],
    model: "aws cloudwatch describe-alarms --state-value ALARM --query 'MetricAlarms[].AlarmName'",
    explain: {
      point: "describe-alarms の --state-value は API の StateValue パラメーターで、サーバー側で絞り込みます。値は OK・ALARM・INSUFFICIENT_DATA のいずれかです。複合アラームは CompositeAlarms に別に返ります。",
      compare: "--query \"MetricAlarms[?StateValue=='ALARM'].AlarmName\" でも同じ名前が得られますが、全件を取得してから手元で絞る方法です。件数が多い環境ではサーバー側で絞るほうが効率的です。",
      pitfalls: ["--state-value alarm と小文字で書く → ValidationError", "INSUFFICIENT_DATA を障害と見なす(データ不足は障害とは限らない)"],
    },
    references: [cliRef("cloudwatch/describe-alarms", "aws cloudwatch describe-alarms"), { title: "CloudWatch アラームの状態", url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-evaluation.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-cw-008", category: "cli", mode: "write", level: 3, examTags: ["SOA", "SAA"], services: ["cloudwatch", "ec2"],
    title: "EC2 の CPU 使用率(5 分平均)を取得する",
    scenario: "アラームが出た web-dev-1(i-0a1b2c3d4e5f60001)について、2026-11-08 05:00〜06:00(UTC)の CPU 使用率を 5 分ごとの平均で取得してください。",
    environment: ["名前空間 AWS/EC2、メトリクス CPUUtilization", "インスタンス i-0a1b2c3d4e5f60001 のデータが 1 分ごとにある"],
    requirements: ["期間 2026-11-08T05:00:00Z 〜 2026-11-08T06:00:00Z", "5 分(300 秒)ごとの Average", "対象のインスタンスに絞る(12 個のデータポイント)"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "get-metric-statistics が成功した", test: (s) => ok(s, "cloudwatch", "get-metric-statistics").length > 0 },
      { label: "5 分ごとの平均が 12 個返った", test: (s) => ok(s, "cloudwatch", "get-metric-statistics").some((r) => Number(r.call.opts.period) === 300 && r.call.opts.statistics?.includes("Average") && r.call.opts["metric-name"] === "CPUUtilization" && JSON.stringify(r.call.opts.dimensions || "").includes("i-0a1b2c3d4e5f60001") && (r.result?.Datapoints || r.result || []).length === 12) },
    ],
    hints: ["必須は --namespace AWS/EC2 --metric-name CPUUtilization --start-time --end-time --period です。", "--statistics Average と --period 300 を指定します。", "インスタンスの指定は --dimensions Name=InstanceId,Value=i-0a1b2c3d4e5f60001 です。忘れると Datapoints が空になります。"],
    model: "aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=i-0a1b2c3d4e5f60001 --start-time 2026-11-08T05:00:00Z --end-time 2026-11-08T06:00:00Z --period 300 --statistics Average",
    explain: {
      point: "CloudWatch のメトリクスは「名前空間 + メトリクス名 + ディメンション」の組み合わせで 1 つに決まります。ディメンションを指定しないと、どのインスタンスの値かが決まらず、空の Datapoints が返ります(エラーにはならない)。Period は 60 の倍数で指定します。",
      compare: "複数のメトリクスや計算式をまとめて取得するなら get-metric-data が推奨です。EC2 の標準のメトリクスは 5 分間隔で、1 分間隔が必要なら詳細モニタリングを有効にします。",
      pitfalls: ["--dimensions を付けない → 結果が空", "--period 5 と分で書く → 秒で指定する", "Datapoints は時刻順に並ぶとは限らない(実際の API)"],
    },
    references: [cliRef("cloudwatch/get-metric-statistics", "aws cloudwatch get-metric-statistics"), { title: "CloudWatch の概念(名前空間・メトリクス・ディメンション)", url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-lambda-009", category: "cli", mode: "fix", level: 2, examTags: ["DVA", "SOA"], services: ["lambda"],
    title: "【障害対応】lambda invoke の Invalid base64",
    scenario: "注文金額を計算する Lambda 関数 order-total をテストしたいのですが、入力欄のコマンドを実行すると Invalid base64 というエラーになります。コマンドを直して関数を実行し、合計金額(1500)を response.json に受け取ってください。",
    environment: ["関数 order-total(東京リージョン)。items の price × qty の合計を返す", "AWS CLI v2 を想定"],
    requirements: ["ペイロードは JSON のまま渡す", "応答を response.json に保存し、total が 1500 になる"],
    editor: { language: "cli", starter: "aws lambda invoke --function-name order-total --payload '{\"orderId\": \"o-2001\", \"items\": [{\"price\": 500, \"qty\": 3}]}' response.json", env: cliEnv() },
    goals: [
      { label: "lambda invoke が成功した(StatusCode 200)", test: (s) => ok(s, "lambda", "invoke").some((r) => r.result?.StatusCode === 200) },
      { label: "response.json の total が 1500", test: (s) => ok(s, "lambda", "invoke").some((r) => r.lambdaResponse?.total === 1500) },
    ],
    hints: ["AWS CLI v2 は、--payload のようなバイナリのパラメーターを既定で base64 として扱います。", "--cli-binary-format raw-in-base64-out を付けると、JSON の文字列をそのまま渡せます。"],
    model: "aws lambda invoke --function-name order-total --cli-binary-format raw-in-base64-out --payload '{\"orderId\": \"o-2001\", \"items\": [{\"price\": 500, \"qty\": 3}]}' response.json",
    explain: {
      point: "AWS CLI v2 から、バイナリ型のパラメーター(--payload など)は既定で base64 として解釈されます。JSON をそのまま渡すには --cli-binary-format raw-in-base64-out を付けるか、設定ファイルの cli_binary_format に設定します。",
      compare: "JSON を base64 に変換して渡す方法でも動きます。関数の中でエラーが起きた場合も HTTP 的には 200 で、FunctionError: Unhandled が返り、詳細は出力ファイルに書かれます。非同期で呼ぶなら --invocation-type Event(202 が返る)です。",
      pitfalls: ["エラーの原因を関数のコードだと考える", "出力ファイル名を省略する(必須)"],
    },
    references: [cliRef("lambda/invoke", "aws lambda invoke"), { title: "AWS CLI v2 の変更点(バイナリパラメーター)", url: "https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-changes.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cli-vpc-010", category: "cli", mode: "write", level: 2, examTags: ["SAA", "SOA", "ANS"], services: ["vpc", "ec2"],
    title: "VPC のプライベートサブネットの ID を調べる",
    scenario: "app-vpc(vpc-0a1b2c3d4e5f00001)に RDS を置くため、パブリック IP を自動で割り当てないサブネット(プライベートサブネット)の ID を一覧にしてください。",
    environment: ["app-vpc: サブネット 4 つ(public-a・public-c・private-a・private-c)", "既定の VPC にもサブネットがある(対象外)"],
    requirements: ["app-vpc のサブネットだけ", "パブリック IP の自動割り当て(MapPublicIpOnLaunch)が false のもの", "サブネット ID だけを出力"],
    editor: { language: "cli", starter: "", env: cliEnv() },
    goals: [
      { label: "describe-subnets が成功した", test: (s) => ok(s, "ec2", "describe-subnets").length > 0 },
      { label: "app-vpc のプライベートサブネット 2 つの ID だけを出力した", test: (s) => ok(s, "ec2", "describe-subnets").some((r) => r.result !== undefined && sameSet(flat(r.result), ["subnet-0aa000000000011a", "subnet-0aa000000000012c"])) },
    ],
    hints: ["aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-0a1b2c3d4e5f00001", "フィルターは空白で区切って複数並べられます(AND)。Name=map-public-ip-on-launch,Values=false", "--query 'Subnets[].SubnetId'"],
    model: "aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-0a1b2c3d4e5f00001 Name=map-public-ip-on-launch,Values=false --query 'Subnets[].SubnetId'",
    explain: {
      point: "--filters に複数のフィルターを並べると AND、1 つの Values に複数の値を並べると OR になります。サブネットがパブリックかどうかは本来ルートテーブル(IGW への経路)で決まりますが、この環境では自動割り当ての設定とタグ Tier を手掛かりにしています。",
      compare: "Name=tag:Tier,Values=private のようにタグで絞る方法も正解です。実際の設計では、ルートテーブルに 0.0.0.0/0 → IGW の経路があるかで判断します(describe-route-tables)。",
      pitfalls: ["vpc-id のフィルターを忘れる → 既定の VPC のサブネットも混ざる", "フィルターをカンマでつなぐ → 1 つのフィルターとして解釈される"],
    },
    references: [cliRef("ec2/describe-subnets", "aws ec2 describe-subnets"), { title: "VPC のサブネット", url: "https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html" }, QUERY], reviewedAt: "2026-11-08", contentVersion: 1,
  },
];
