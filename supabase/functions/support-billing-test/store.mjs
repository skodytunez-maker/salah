export function createPostgresStore(sql){
 return {
  lock:(user,fn)=>sql.begin(async tx=>{
   await tx`set local statement_timeout = '25s'`;
   await tx`select pg_advisory_xact_lock(hashtextextended(${user},1489995))`;
   const rows=await tx`select state from salah_billing_test_private.accounts where user_id=${user}::uuid for update`;
   const {state,value}=await fn(rows[0]?.state??null);
   await tx`insert into salah_billing_test_private.accounts(user_id,state) values(${user}::uuid,${tx.json(state)}) on conflict(user_id) do update set state=excluded.state,updated_at=now()`;
   return value;
  }),
  async findOperation(id){
   const rows=await sql`select user_id from salah_billing_test_private.accounts where state->'operations' @> ${sql.json([{id}])}::jsonb limit 1`;
   return rows[0]?.user_id??null;
  }
 };
}
