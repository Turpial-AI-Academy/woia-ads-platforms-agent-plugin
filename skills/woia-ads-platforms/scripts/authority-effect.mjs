import {createHash} from 'node:crypto';
export function canonical(x){return Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x)}
export const digest=x=>createHash('sha256').update(canonical(x)).digest('hex');
export function guard(ok,code){if(!ok)throw new Error(code)}
export function authorize(c,a,owner,read=false){
 guard(a?.authenticated===true&&a.organization===c.organization&&a.scope===c.scope&&a.task_id&&a.actor_id,'AUTHENTICATED_SCOPE_REQUIRED');
 guard(Number.isFinite(a.now)&&a.now<a.expires_at&&!a.revoked&&!a.hold&&a.source_current===true&&a.conflict===false,'CURRENT_AUTHORITY_REQUIRED');
 guard(a.actions?.includes(c.action),'ACTION_NOT_GRANTED');
 if(!read){guard(a.department===owner&&a.writer===owner,'OWNER_ONLY'); guard(a.policy_revision&&a.binding_revision&&a.authority_revision,'REVISIONS_REQUIRED');
 const p=a.approval; guard(p&&p.approver!==a.actor_id&&p.command_digest===digest(c)&&p.policy_revision===a.policy_revision&&p.binding_revision===a.binding_revision&&p.authority_revision===a.authority_revision&&p.expires_at>a.now&&p.result==='APPROVED','EXACT_APPROVAL_REQUIRED')}
}
export function beginEffect(s,c,a,owner){
 authorize(c,a,owner); guard(s.organization===c.organization&&s.scope===c.scope,'STATE_SCOPE_MISMATCH');
 guard(c.effect_id&&c.resource_id&&c.payload,'COMMAND_REQUIRED');
 const key=c.organization+'/'+c.scope+'/'+c.effect_id,old=s.effects?.[key];
 if(old){guard(old.digest===digest(c),'IDEMPOTENCY_CONFLICT');return{state:s,effect:old,dispatch:false}}
 guard(c.expected_revision===s.revision,'COMMAND_REVISION_REQUIRED');
 const n=structuredClone(s); n.effects??={}; const e={id:c.effect_id,digest:digest(c),status:'PENDING',command:structuredClone(c),authority_revision:a.authority_revision};
 n.effects[key]=e;n.revision++;return{state:n,effect:e,dispatch:true};
}
export function reconcileEffect(s,c,a,owner){
 authorize(c,a,owner);guard(s.organization===c.organization&&s.scope===c.scope,'STATE_SCOPE_MISMATCH');guard(c.expected_revision===s.revision,'STALE_STATE');
 const key=c.organization+'/'+c.scope+'/'+c.effect_id,e=s.effects?.[key],o=c.payload;
 guard(e&&o?.effect_id===e.id&&o.source_id&&o.evidence_id&&['SUCCEEDED','FAILED','UNKNOWN'].includes(o.status),'ATTRIBUTED_RECONCILIATION_REQUIRED');
 guard(!['SUCCEEDED','FAILED'].includes(e.status)||e.status===o.status,'TERMINAL_EFFECT_CONFLICT');
 const n=structuredClone(s);n.effects[key]={...e,status:o.status,observation:structuredClone(o)};n.revision++;return n;
}
export async function dispatchPending(s,c,a,owner,port){
 authorize(c,a,owner);guard(s.organization===c.organization&&s.scope===c.scope,'STATE_SCOPE_MISMATCH');const key=c.organization+'/'+c.scope+'/'+c.effect_id,e=s.effects?.[key];
 guard(e?.digest===digest(c)&&e.status==='PENDING','PENDING_EFFECT_REQUIRED');
 guard(port?.qualification==='PASS'&&port.binding_revision===a.binding_revision&&typeof port.execute==='function'&&typeof port.persist==='function','QUALIFIED_DURABLE_PORT_REQUIRED');
 const claimed=structuredClone(s);claimed.effects[key].status='UNKNOWN';claimed.revision++;guard(await port.persist(claimed,s.revision)===true,'DURABLE_CAS_REJECTED');
 authorize(c,a,owner);let o;try{o=await port.execute(structuredClone(c))}catch{return claimed}
 if(!o||!['SUCCEEDED','FAILED'].includes(o.status)||!o.source_id||!o.evidence_id)return claimed;
 const n=structuredClone(claimed);n.effects[key]={...n.effects[key],status:o.status,observation:structuredClone(o)};n.revision++;guard(await port.persist(n,claimed.revision)===true,'DURABLE_CAS_REJECTED');return n;
}
