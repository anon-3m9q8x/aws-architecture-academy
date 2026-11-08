// コマンド・ポリシー演習の模擬環境(初期状態)。実在の AWS アカウント・リソースではない。
// アカウント ID・IP アドレスはドキュメント用の例示値(111122223333 / 444455556666、203.0.113.0/24 など)を使う。
export const ACCOUNT = "111122223333";
export const PARTNER = "444455556666";
const NOW = "2026-11-08T06:00:00Z";
const V = "2012-10-17";

export const alice = { kind: "iam-user", name: "alice", account: ACCOUNT };
export const bob = { kind: "iam-user", name: "bob", account: ACCOUNT };

const obj = (size, day = "2026-11-02T01:15:00Z", extra = {}) => ({ size, modified: day, ...extra });
const s3Buckets = () => ({
  "my-bucket": {
    created: "2026-09-01T00:00:00Z",
    objects: {
      "users/alice/report.pdf": obj(482133, "2026-11-02T01:15:00Z"),
      "users/alice/notes/todo.txt": obj(812, "2026-11-05T08:40:00Z"),
      "users/alice/photo.jpg": obj(1503221, "2026-10-28T12:00:00Z"),
      "users/bob/secret.txt": obj(355, "2026-11-01T09:00:00Z"),
      "users/bob/plan.xlsx": obj(20480, "2026-11-03T10:30:00Z"),
      "shared/readme.md": obj(1200, "2026-09-02T00:00:00Z"),
    },
  },
  "app-logs-111122223333": { created: "2026-08-15T00:00:00Z", objects: { "2026/11/08/app.log": obj(91234, NOW) } },
});

const EC2 = () => ({
  instances: [
    { ReservationId: "r-0a1b2c3d4e5f60001", InstanceId: "i-0a1b2c3d4e5f60001", ImageId: "ami-0abcdef1234567890", InstanceType: "t3.small", State: { Code: 16, Name: "running" }, LaunchTime: "2026-10-20T00:10:00+00:00", Placement: { AvailabilityZone: "ap-northeast-1a" }, PrivateIpAddress: "10.0.1.21", PublicIpAddress: "198.51.100.21", SubnetId: "subnet-0aa0000000000001a", VpcId: "vpc-0a1b2c3d4e5f00001", SecurityGroups: [{ GroupName: "web-sg", GroupId: "sg-0a00000000000web1" }], Tags: [{ Key: "Name", Value: "web-dev-1" }, { Key: "Environment", Value: "dev" }] },
    { ReservationId: "r-0a1b2c3d4e5f60002", InstanceId: "i-0a1b2c3d4e5f60002", ImageId: "ami-0abcdef1234567890", InstanceType: "m7g.large", State: { Code: 16, Name: "running" }, LaunchTime: "2026-09-30T03:00:00+00:00", Placement: { AvailabilityZone: "ap-northeast-1a" }, PrivateIpAddress: "10.0.1.31", PublicIpAddress: "198.51.100.31", SubnetId: "subnet-0aa0000000000001a", VpcId: "vpc-0a1b2c3d4e5f00001", SecurityGroups: [{ GroupName: "web-sg", GroupId: "sg-0a00000000000web1" }], Tags: [{ Key: "Name", Value: "web-prod-1" }, { Key: "Environment", Value: "prod" }] },
    { ReservationId: "r-0a1b2c3d4e5f60002", InstanceId: "i-0a1b2c3d4e5f60003", ImageId: "ami-0abcdef1234567890", InstanceType: "m7g.large", State: { Code: 16, Name: "running" }, LaunchTime: "2026-09-30T03:00:00+00:00", Placement: { AvailabilityZone: "ap-northeast-1c" }, PrivateIpAddress: "10.0.2.31", PublicIpAddress: "198.51.100.32", SubnetId: "subnet-0aa0000000000002c", VpcId: "vpc-0a1b2c3d4e5f00001", SecurityGroups: [{ GroupName: "web-sg", GroupId: "sg-0a00000000000web1" }], Tags: [{ Key: "Name", Value: "web-prod-2" }, { Key: "Environment", Value: "prod" }] },
    { ReservationId: "r-0a1b2c3d4e5f60004", InstanceId: "i-0a1b2c3d4e5f60004", ImageId: "ami-0fedcba9876543210", InstanceType: "r7g.xlarge", State: { Code: 80, Name: "stopped" }, LaunchTime: "2026-08-01T00:00:00+00:00", Placement: { AvailabilityZone: "ap-northeast-1a" }, PrivateIpAddress: "10.0.11.40", SubnetId: "subnet-0aa000000000011a", VpcId: "vpc-0a1b2c3d4e5f00001", SecurityGroups: [{ GroupName: "batch-sg", GroupId: "sg-0a0000000000batch" }], Tags: [{ Key: "Name", Value: "batch-dev-1" }, { Key: "Environment", Value: "dev" }] },
    { ReservationId: "r-0a1b2c3d4e5f60005", InstanceId: "i-0a1b2c3d4e5f60005", ImageId: "ami-0abcdef1234567890", InstanceType: "t3.micro", State: { Code: 16, Name: "running" }, LaunchTime: "2026-11-01T00:00:00+00:00", Placement: { AvailabilityZone: "us-east-1a" }, PrivateIpAddress: "172.31.5.10", SubnetId: "subnet-0bb0000000000001a", VpcId: "vpc-0b1b2c3d4e5f00009", SecurityGroups: [{ GroupName: "default", GroupId: "sg-0b000000000000def" }], Tags: [{ Key: "Name", Value: "dr-test-1" }, { Key: "Environment", Value: "dev" }], region: "us-east-1" },
  ],
  vpcs: [
    { VpcId: "vpc-0a1b2c3d4e5f00001", CidrBlock: "10.0.0.0/16", State: "available", IsDefault: false, Tags: [{ Key: "Name", Value: "app-vpc" }] },
    { VpcId: "vpc-0a1b2c3d4e5f00002", CidrBlock: "172.31.0.0/16", State: "available", IsDefault: true, Tags: [] },
    { VpcId: "vpc-0b1b2c3d4e5f00009", CidrBlock: "172.31.0.0/16", State: "available", IsDefault: true, Tags: [], region: "us-east-1" },
  ],
  subnets: [
    { SubnetId: "subnet-0aa0000000000001a", VpcId: "vpc-0a1b2c3d4e5f00001", CidrBlock: "10.0.1.0/24", AvailabilityZone: "ap-northeast-1a", MapPublicIpOnLaunch: true, AvailableIpAddressCount: 249, Tags: [{ Key: "Name", Value: "public-a" }, { Key: "Tier", Value: "public" }] },
    { SubnetId: "subnet-0aa0000000000002c", VpcId: "vpc-0a1b2c3d4e5f00001", CidrBlock: "10.0.2.0/24", AvailabilityZone: "ap-northeast-1c", MapPublicIpOnLaunch: true, AvailableIpAddressCount: 250, Tags: [{ Key: "Name", Value: "public-c" }, { Key: "Tier", Value: "public" }] },
    { SubnetId: "subnet-0aa000000000011a", VpcId: "vpc-0a1b2c3d4e5f00001", CidrBlock: "10.0.11.0/24", AvailabilityZone: "ap-northeast-1a", MapPublicIpOnLaunch: false, AvailableIpAddressCount: 246, Tags: [{ Key: "Name", Value: "private-a" }, { Key: "Tier", Value: "private" }] },
    { SubnetId: "subnet-0aa000000000012c", VpcId: "vpc-0a1b2c3d4e5f00001", CidrBlock: "10.0.12.0/24", AvailabilityZone: "ap-northeast-1c", MapPublicIpOnLaunch: false, AvailableIpAddressCount: 251, Tags: [{ Key: "Name", Value: "private-c" }, { Key: "Tier", Value: "private" }] },
    { SubnetId: "subnet-0aa0000000000d01a", VpcId: "vpc-0a1b2c3d4e5f00002", CidrBlock: "172.31.0.0/20", AvailabilityZone: "ap-northeast-1a", MapPublicIpOnLaunch: true, AvailableIpAddressCount: 4091, Tags: [] },
  ],
  securityGroups: [
    { GroupId: "sg-0a00000000000web1", GroupName: "web-sg", VpcId: "vpc-0a1b2c3d4e5f00001", Description: "web servers", IpPermissions: [{ IpProtocol: "tcp", FromPort: 443, ToPort: 443, IpRanges: [{ CidrIp: "0.0.0.0/0" }] }], Tags: [] },
  ],
});

// CPU 使用率(5 分ごと)。web-dev-1 は 06:00 前後に高くなる
function cpuSeries(base, spike) {
  const out = [];
  for (let m = 0; m < 240; m += 1) {
    const t = new Date(Date.parse("2026-11-08T03:00:00Z") + m * 60000).toISOString();
    const v = base + ((m * 7) % 11) + (m >= 150 && m < 200 ? spike : 0);
    out.push({ t, v: Math.round(v * 10) / 10 });
  }
  return out;
}

const managed = {
  ReadOnlyEc2: { Version: V, Statement: [{ Effect: "Allow", Action: ["ec2:Describe*"], Resource: "*" }] },
};

/** CLI 演習の基本の環境(呼び出し元は alice) */
export function cliEnv(extra = {}) {
  return {
    account: ACCOUNT, region: "ap-northeast-1", now: NOW, sourceIp: "203.0.113.10",
    caller: alice,
    policies: [
      { kind: "identity", name: "AliceDailyOps", to: ["user:alice"], doc: { Version: V, Statement: [
        { Sid: "Describe", Effect: "Allow", Action: ["ec2:Describe*", "cloudwatch:DescribeAlarms", "cloudwatch:GetMetricStatistics", "lambda:ListFunctions", "logs:FilterLogEvents"], Resource: "*" },
        { Sid: "OwnPrefixList", Effect: "Allow", Action: "s3:ListBucket", Resource: "arn:aws:s3:::my-bucket", Condition: { StringLike: { "s3:prefix": ["users/${aws:username}/", "users/${aws:username}/*"] } } },
        { Sid: "OwnPrefixObjects", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::my-bucket/users/${aws:username}/*" },
        { Sid: "VersioningOnLogs", Effect: "Allow", Action: ["s3:GetBucketVersioning", "s3:PutBucketVersioning"], Resource: "arn:aws:s3:::app-logs-111122223333" },
        { Sid: "StopStartDevOnly", Effect: "Allow", Action: ["ec2:StopInstances", "ec2:StartInstances"], Resource: "arn:aws:ec2:*:111122223333:instance/*", Condition: { StringEquals: { "aws:ResourceTag/Environment": "dev" } } },
        { Sid: "InvokeOrderTotal", Effect: "Allow", Action: "lambda:InvokeFunction", Resource: "arn:aws:lambda:ap-northeast-1:111122223333:function:order-total" },
      ] } },
    ],
    s3: { buckets: s3Buckets() },
    ec2: EC2(),
    cloudwatch: {
      alarms: [
        { AlarmName: "web-dev-1-cpu-high", AlarmArn: `arn:aws:cloudwatch:ap-northeast-1:${ACCOUNT}:alarm:web-dev-1-cpu-high`, StateValue: "ALARM", StateReason: "Threshold Crossed: 1 datapoint [91.4] was greater than the threshold (80.0).", MetricName: "CPUUtilization", Namespace: "AWS/EC2", Statistic: "Average", Dimensions: [{ Name: "InstanceId", Value: "i-0a1b2c3d4e5f60001" }], Period: 300, EvaluationPeriods: 1, Threshold: 80, ComparisonOperator: "GreaterThanThreshold", ActionsEnabled: true },
        { AlarmName: "orders-5xx-rate", AlarmArn: `arn:aws:cloudwatch:ap-northeast-1:${ACCOUNT}:alarm:orders-5xx-rate`, StateValue: "ALARM", StateReason: "Threshold Crossed: 2 out of the last 3 datapoints were greater than the threshold (5.0).", MetricName: "5XXError", Namespace: "AWS/ApiGateway", Statistic: "Sum", Dimensions: [{ Name: "ApiName", Value: "orders-api" }], Period: 60, EvaluationPeriods: 3, Threshold: 5, ComparisonOperator: "GreaterThanThreshold", ActionsEnabled: true },
        { AlarmName: "web-prod-1-cpu-high", AlarmArn: `arn:aws:cloudwatch:ap-northeast-1:${ACCOUNT}:alarm:web-prod-1-cpu-high`, StateValue: "OK", StateReason: "Threshold Crossed: 1 datapoint [22.0] was not greater than the threshold (80.0).", MetricName: "CPUUtilization", Namespace: "AWS/EC2", Statistic: "Average", Dimensions: [{ Name: "InstanceId", Value: "i-0a1b2c3d4e5f60002" }], Period: 300, EvaluationPeriods: 1, Threshold: 80, ComparisonOperator: "GreaterThanThreshold", ActionsEnabled: true },
        { AlarmName: "batch-queue-depth", AlarmArn: `arn:aws:cloudwatch:ap-northeast-1:${ACCOUNT}:alarm:batch-queue-depth`, StateValue: "INSUFFICIENT_DATA", StateReason: "Insufficient Data: 1 datapoint was unknown.", MetricName: "ApproximateNumberOfMessagesVisible", Namespace: "AWS/SQS", Statistic: "Maximum", Dimensions: [{ Name: "QueueName", Value: "batch-jobs" }], Period: 300, EvaluationPeriods: 2, Threshold: 1000, ComparisonOperator: "GreaterThanThreshold", ActionsEnabled: true },
      ],
      metrics: {
        "AWS/EC2|CPUUtilization|InstanceId=i-0a1b2c3d4e5f60001": cpuSeries(20, 65),
        "AWS/EC2|CPUUtilization|InstanceId=i-0a1b2c3d4e5f60002": cpuSeries(18, 0),
      },
      units: { CPUUtilization: "Percent" },
    },
    lambda: { functions: {
      "order-total": { Runtime: "python3.13", Handler: "app.handler", Role: `arn:aws:iam::${ACCOUNT}:role/order-total-role`, MemorySize: 256, Timeout: 10, behavior: "order-total" },
      "thumbnail-maker": { Runtime: "nodejs22.x", Handler: "index.handler", Role: `arn:aws:iam::${ACCOUNT}:role/thumbnail-role`, MemorySize: 1024, Timeout: 30, behavior: "echo" },
    } },
    logs: { groups: { "/aws/lambda/order-total": { events: [
      { t: "2026-11-08T05:58:01Z", stream: "2026/11/08/[$LATEST]a1", message: "START RequestId: 1f2e Version: $LATEST" },
      { t: "2026-11-08T05:58:02Z", stream: "2026/11/08/[$LATEST]a1", message: "ERROR items is not a list: {'price': 100}" },
      { t: "2026-11-08T05:59:10Z", stream: "2026/11/08/[$LATEST]a1", message: "INFO total=1500 orderId=o-1001" },
      { t: "2026-11-08T05:59:40Z", stream: "2026/11/08/[$LATEST]b2", message: "ERROR Task timed out after 10.00 seconds" },
    ] } } },
    local: { files: { "report.csv": { size: 2048 }, "summary.pdf": { size: 102400 } } },
    ...extra,
  };
}

/** API 演習の基本の環境 */
export function apiEnv(extra = {}) {
  return {
    account: ACCOUNT, region: "ap-northeast-1", now: NOW, sourceIp: "203.0.113.10",
    apis: {
      orders: {
        name: "orders-api", id: "a1b2c3d4e5", host: "a1b2c3d4e5.execute-api.ap-northeast-1.amazonaws.com", stage: "prod", region: "ap-northeast-1",
        routes: [
          { method: "GET", path: "/items/{id}", auth: "none", lambda: "catalog-get", handler: "getItem", table: "Catalog" },
          { method: "GET", path: "/items", auth: "none", lambda: "catalog-list", handler: "listItems", table: "Catalog" },
          { method: "GET", path: "/orders", auth: "cognito", lambda: "orders-list", handler: "listItems", table: "Orders" },
          { method: "POST", path: "/orders", auth: "cognito", lambda: "orders-create", handler: "createItem", table: "Orders", validate: { required: ["productId", "quantity"], types: { productId: "string", quantity: "integer" }, min: { quantity: 1 } } },
          { method: "DELETE", path: "/orders/{id}", auth: "cognito", lambda: "orders-delete", handler: "deleteOwnItem", table: "Orders" },
        ],
      },
      partner: {
        name: "partner-api", id: "p9q8r7s6t5", host: "p9q8r7s6t5.execute-api.ap-northeast-1.amazonaws.com", stage: "v1", region: "ap-northeast-1",
        routes: [{ method: "GET", path: "/stock/{id}", auth: "none", apiKey: true, lambda: "stock-get", handler: "getItem", table: "Stock" }],
      },
    },
    apiHosts: ["dynamodb.ap-northeast-1.amazonaws.com", "lambda.ap-northeast-1.amazonaws.com", "secure-uploads-111122223333.s3.ap-northeast-1.amazonaws.com"],
    tokens: {
      "eyJ.alice.valid": { sub: "alice-7c1e", username: "alice", groups: ["customer"], scopes: ["orders/read", "orders/write"] },
      "eyJ.alice.expired": { sub: "alice-7c1e", username: "alice", expired: true },
      "eyJ.admin.valid": { sub: "admin-0001", username: "admin", groups: ["admin"], scopes: ["orders/read", "orders/write"] },
    },
    apiKeys: { "pk-demo-7Hq2": { plan: "Partner-Basic" }, "pk-demo-over": { plan: "Partner-Free", throttled: true } },
    signers: {
      alice: alice,
      bob: bob,
      "OrderService": { kind: "iam-role", name: "OrderService", session: "app", account: ACCOUNT },
    },
    policies: [
      { kind: "identity", name: "CustomerOrdersOwnData", to: ["user:alice", "user:bob"], doc: { Version: V, Statement: [
        { Sid: "OwnPartitionOnly", Effect: "Allow", Action: ["dynamodb:GetItem", "dynamodb:Query"], Resource: [`arn:aws:dynamodb:ap-northeast-1:${ACCOUNT}:table/CustomerOrders`], Condition: { "ForAllValues:StringEquals": { "dynamodb:LeadingKeys": ["${aws:username}"] } } },
        { Sid: "ReadOrders", Effect: "Allow", Action: ["dynamodb:GetItem"], Resource: `arn:aws:dynamodb:ap-northeast-1:${ACCOUNT}:table/Orders` },
      ] } },
      { kind: "identity", name: "OrderServiceAccess", to: ["role:OrderService"], doc: { Version: V, Statement: [
        { Effect: "Allow", Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"], Resource: `arn:aws:dynamodb:ap-northeast-1:${ACCOUNT}:table/Orders` },
        { Effect: "Allow", Action: ["s3:PutObject", "s3:GetObject"], Resource: "arn:aws:s3:::secure-uploads-111122223333/*" },
      ] } },
    ],
    dynamodb: { tables: {
      Catalog: { key: "id", keyType: "S", items: [{ id: "item-1", name: "ステンレスボトル", price: 1800, category: "kitchen" }, { id: "item-2", name: "折りたたみ傘", price: 2400, category: "outdoor" }, { id: "item-3", name: "保冷バッグ", price: 1500, category: "outdoor" }] },
      Orders: { key: "orderId", keyType: "S", items: [{ orderId: "o-1001", customer: "alice", productId: "item-1", quantity: 2, total: 3600, status: "SHIPPED" }, { orderId: "o-1002", customer: "bob", productId: "item-3", quantity: 1, total: 1500, status: "PENDING" }] },
      Stock: { key: "id", keyType: "S", items: [{ id: "item-1", stock: 42, warehouse: "TYO-1" }, { id: "item-2", stock: 0, warehouse: "OSA-1" }] },
      CustomerOrders: { key: "customerId", keyType: "S", items: [{ customerId: "alice", orderId: "o-1001", status: "SHIPPED", total: 3600 }, { customerId: "alice", orderId: "o-1003", status: "PENDING", total: 1800 }, { customerId: "bob", orderId: "o-1002", status: "PENDING", total: 1500 }] },
    } },
    lambda: { functions: { "order-total": { behavior: "order-total" } } },
    s3: { buckets: { "secure-uploads-111122223333": { created: "2026-10-01T00:00:00Z", objects: {}, policy: { Version: V, Statement: [
      { Sid: "DenyUnencryptedUploads", Effect: "Deny", Principal: "*", Action: "s3:PutObject", Resource: "arn:aws:s3:::secure-uploads-111122223333/*", Condition: { StringNotEquals: { "s3:x-amz-server-side-encryption": "aws:kms" } } },
      { Sid: "DenyInsecureTransport", Effect: "Deny", Principal: "*", Action: "s3:*", Resource: ["arn:aws:s3:::secure-uploads-111122223333", "arn:aws:s3:::secure-uploads-111122223333/*"], Condition: { Bool: { "aws:SecureTransport": "false" } } },
    ] } } } },
    ...extra,
  };
}

export { managed };
