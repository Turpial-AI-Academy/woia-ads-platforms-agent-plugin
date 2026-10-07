import {guard,authorize} from './authority-effect.mjs';
// Meta Marketing API port. Account/version/qualification belong to private bindings.
export function metaPort({version,account_id,token,binding_revision,qualification,persist,context,fetchImpl=globalThis.fetch}){
 guard(/^v\d+\.\d+$/.test(version??'')&&/^act_\d+$/.test(account_id??'')&&token&&binding_revision,'META_BINDING_REQUIRED');
 return{qualification,binding_revision,persist,async execute(c){
  authorize(c,context,'Ads',c.action==='ads.performance.read');
  guard(qualification==='PASS'&&context.binding_revision===binding_revision,'QUALIFIED_META_BINDING_REQUIRED');
  const p=c.payload;guard(p.meta?.account_id===account_id&&p.meta?.api_version===version,'EXACT_META_BINDING_REQUIRED');
  let target=p.meta.target_id;guard(/^\d+$/.test(target??''),'META_TARGET_REQUIRED');
  let fields={},method='POST',edge='';
  if(c.action==='ads.campaign.create'){
   target=account_id;edge='/campaigns';
   guard(p.meta.objective&&Array.isArray(p.meta.special_ad_categories),'META_CAMPAIGN_POLICY_REQUIRED');
   fields={name:p.name,status:'PAUSED',objective:p.meta.objective,special_ad_categories:JSON.stringify(p.meta.special_ad_categories)};
  }else if(c.action==='ads.campaign.update'){guard(p.name,'CAMPAIGN_NAME_REQUIRED');fields={name:p.name}}
  else if(c.action==='ads.campaign.pause')fields={status:'PAUSED'};
  else if(c.action==='ads.campaign.resume')fields={status:'ACTIVE'};
  else if(c.action==='ads.campaign.archive')fields={status:'ARCHIVED'};
  else if(c.action==='ads.budget.set'){
   guard(p.budget_period==='daily'&&p.meta.currency===p.currency&&p.meta.scale===p.scale&&/^\d+$/.test(p.amount_minor),'META_ACCOUNT_CURRENCY_REQUIRED');
   fields={daily_budget:p.amount_minor};
  }else if(c.action==='ads.targeting.configure')fields={targeting:JSON.stringify(p.targeting)};
  else if(c.action==='ads.conversion.configure'){guard(p.meta.promoted_object&&p.meta.optimization_goal,'META_CONVERSION_REQUIRED');fields={promoted_object:JSON.stringify(p.meta.promoted_object),optimization_goal:p.meta.optimization_goal}}
  else if(c.action==='ads.performance.read'){method='GET';edge='/insights';fields={fields:'campaign_id,impressions,clicks,spend'}}
  else throw new Error('META_ACTION_NOT_HTTP');
  // UNKNOWN on network/provider errors; no automatic retries and no token in evidence.
  const query=new URLSearchParams(fields);const url='https://graph.facebook.com/'+version+'/'+target+edge;
  const response=await fetchImpl(method==='GET'?url+'?'+query:url,{method,redirect:'error',headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(method==='POST'?{body:query}:{})});
  const data=await response.json();
  if(!response.ok||data.error)return{status:'UNKNOWN',source_id:'meta:'+account_id,evidence_id:c.effect_id,error_code:data.error?.code??response.status};
  const confirmed=c.action==='ads.campaign.create'?Boolean(data.id):method==='GET'?Array.isArray(data.data):data.success===true;
  if(!confirmed)return{status:'UNKNOWN',source_id:'meta:'+account_id,evidence_id:c.effect_id};
  return{status:'SUCCEEDED',source_id:'meta:'+account_id,evidence_id:c.effect_id,provider_result:data};
 }};
}
