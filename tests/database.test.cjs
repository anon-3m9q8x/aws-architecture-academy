const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

test('Postgres RLS isolates accounts and RPC rejects stale writes', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  let currentId;
  const payload = {format:'aws-academy-v1',records:{'aaa.notebook.v1':{notes:{ec2:'test memo'},completed:['ec2'],favorites:[]}}};
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      insert into auth.users values ('${alice}'), ('${bob}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    const schema = readFileSync(new URL('../supabase/schema.sql', `file://${__filename}`), 'utf8');
    await db.exec("create table public.nutripath_accounts (user_id uuid, data jsonb); insert into public.nutripath_accounts values ('"+alice+"', '{\"keep\":true}')");
    await db.exec(schema);
    await db.exec(schema); // Installation is repeatable.
    async function as(id, role='authenticated') {
      currentId=id;
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec(`set role ${role}`);
    }
    async function save(revision, data=payload) {
      return db.query('select * from public.save_academy_state($1::jsonb, $2::bigint, $3::uuid)', [JSON.stringify(data), revision, currentId || null]);
    }
    await as(alice);
    assert.equal((await save(0)).rows[0].revision, 1);
    assert.equal((await save(1)).rows[0].revision, 2);
    await assert.rejects(save(1), {code:'PT409'});
    await assert.rejects(save(0), {code:'PT409'});
    assert.equal((await db.query('select * from public.academy_accounts')).rows.length, 1);

    await as(bob);
    await assert.rejects(db.query('select * from public.save_academy_state($1::jsonb,0,$2::uuid)',[JSON.stringify(payload),alice]), {code:'42501'});
    assert.equal((await db.query('select * from public.academy_accounts')).rows.length, 0);
    assert.equal((await db.query('update public.academy_accounts set data=$1 where user_id=$2 returning *', [JSON.stringify(payload), alice])).rows.length, 0);
    await assert.rejects(db.query('insert into public.academy_accounts(user_id,data) values($1,$2)', [alice,JSON.stringify(payload)]), {code:'42501'});
    await assert.rejects(save(0,{}), {code:'23514'});
    await assert.rejects(save(0,{format:null,records:{}}), {code:'23514'});
    assert.equal((await save(0)).rows[0].user_id, bob);

    await as('', 'anon');
    await assert.rejects(db.query('select * from public.academy_accounts'), {code:'42501'});
    await assert.rejects(save(0), {code:'42501'});
    await as(alice);
    assert.deepEqual((await db.query('select user_id, revision from public.academy_accounts')).rows, [{user_id:alice, revision:2}]);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select data from public.nutripath_accounts')).rows,[{data:{keep:true}}]);
  } finally { await db.close(); }
});
