import {authorize,beginEffect,reconcileEffect,guard} from './authority-effect.mjs';
export {dispatchPending,digest} from './authority-effect.mjs';
export const actions=["ads.campaign.create","ads.campaign.update","ads.campaign.pause","ads.campaign.resume","ads.campaign.archive","ads.targeting.configure","ads.budget.set","ads.conversion.configure","ads.signal.observe","ads.performance.read","ads.effect.reconcile"];
export const initialState=(organization,scope)=>{guard(organization&&scope,'STATE_SCOPE_REQUIRED');return{organization,scope,revision:0,campaigns:{},signals:[],effects:{}}};
export function apply(state,c,a){
 guard(state.organization===c.organization&&state.scope===c.scope,'STATE_SCOPE_MISMATCH');
 guard(actions.includes(c.action),'UNKNOWN_ACTION');authorize(c,a,'Ads',c.action==='ads.performance.read');
 if(c.action==='ads.performance.read')return structuredClone(state.signals.filter(x=>x.campaign_id===c.resource_id));
 if(c.action==='ads.effect.reconcile')return{state:reconcileEffect(state,c,a,'Ads')};
 guard(!c.payload.recipient&&!c.payload.message&&!c.payload.contact,'NO_PERSON_MESSAGING');
 const allowed={
 'ads.campaign.create':['campaign_id','name','initial_status','meta'],
 'ads.campaign.update':['name','meta'],
 'ads.campaign.pause':['meta'], 'ads.campaign.resume':['meta'], 'ads.campaign.archive':['meta'],
 'ads.targeting.configure':['targeting','accepted_policy_revision','meta'],
 'ads.budget.set':['amount_minor','currency','scale','budget_period','meta'],
 'ads.conversion.configure':['conversion_id','source_id','purpose','meta'],
 'ads.signal.observe':['kind','source_id','evidence_id','observed_at','external_ref','attribution','campaign_id','metrics']};
 guard(c.payload&&Object.keys(c.payload).every(key=>allowed[c.action]?.includes(key)),'ACTION_PAYLOAD_FORBIDDEN');
 if(c.action==='ads.campaign.update')guard(c.payload.name,'CAMPAIGN_NAME_REQUIRED');
 if(c.action==='ads.signal.observe'){
 guard(c.expected_revision===state.revision&&c.payload.source_id&&c.payload.evidence_id&&Number.isFinite(c.payload.observed_at),'ATTRIBUTED_SIGNAL_REQUIRED');
 const n=structuredClone(state);n.signals.push(structuredClone(c.payload));n.revision++;
 const inquiry=['inquiry','lead','comment','message'].includes(c.payload.kind);
 return{state:n,interaction:inquiry?{schema:'dev.woia.normalized-inbound-interaction/v1',source_id:c.payload.source_id,evidence_id:c.payload.evidence_id,external_ref:c.payload.external_ref,route:['woia-communications','Customer Service'],attribution:structuredClone(c.payload.attribution??{}),accepted:false}:null};
 }
 if(c.action==='ads.budget.set')guard(/^\d+$/.test(c.payload.amount_minor)&&BigInt(c.payload.amount_minor)>0n&&/^[A-Z]{3}$/.test(c.payload.currency??'')&&Number.isSafeInteger(c.payload.scale)&&c.payload.scale>=0&&c.payload.scale<=6&&c.payload.budget_period,'EXACT_SPEND_REQUIRED');
 if(c.action==='ads.targeting.configure')guard(c.payload.targeting&&c.payload.accepted_policy_revision===a.policy_revision,'TARGETING_POLICY_REQUIRED');
 if(c.action==='ads.conversion.configure')guard(c.payload.conversion_id&&c.payload.source_id&&c.payload.purpose,'CONVERSION_PURPOSE_REQUIRED');
 if(c.action==='ads.campaign.create')guard(c.payload.campaign_id&&c.payload.name&&c.payload.initial_status==='PAUSED'&&!state.campaigns[c.payload.campaign_id],'PAUSED_UNIQUE_CAMPAIGN_REQUIRED');
 if(c.action!=='ads.campaign.create'){
 const current=state.campaigns[c.resource_id];guard(current&&current.status!=='ARCHIVED','ACTIVE_CAMPAIGN_REQUIRED');
 if(c.action==='ads.campaign.resume')guard(current.status==='PAUSED','PAUSED_CAMPAIGN_REQUIRED');
 if(c.action==='ads.campaign.pause')guard(current.status==='ACTIVE','RUNNING_CAMPAIGN_REQUIRED');
 }
 return beginEffect(state,c,a,'Ads');
}
export function projectSucceeded(state,effectId,organization,scope){
 guard(state.organization===organization&&state.scope===scope,'STATE_SCOPE_MISMATCH');
 const e=state.effects[organization+'/'+scope+'/'+effectId];guard(e?.status==='SUCCEEDED','SUCCESS_EVIDENCE_REQUIRED');
 if(e.projected)return state;
 const n=structuredClone(state),c=e.command;const id=c.action==='ads.campaign.create'?c.payload.campaign_id:c.resource_id;
 const current=n.campaigns[id]??{};
 const status={'ads.campaign.create':'PAUSED','ads.campaign.pause':'PAUSED','ads.campaign.resume':'ACTIVE','ads.campaign.archive':'ARCHIVED'}[c.action];
 n.campaigns[id]={...current,...structuredClone(c.payload),...(status?{status}:{}),last_effect_id:effectId};
 n.effects[organization+'/'+scope+'/'+effectId].projected=true;n.revision++;return n;
}
