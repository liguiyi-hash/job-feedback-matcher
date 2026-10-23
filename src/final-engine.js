/* © 2026 贵毅_TUFE · 来源：https://github.com/liguiyi-hash/job-feedback-matcher · 自有代码保留所有权利，见LICENSE。 */
/* 自动选择：明确方向优先，模型补充新岗位，同类按最早；不使用行号或候选人身份。 */
(function(root){
 'use strict';
 const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.MatchEngine;
 const earliest=xs=>[...xs].sort((a,b)=>(a.timestamp??Infinity)-(b.timestamp??Infinity)||a.index-b.index)[0];
 async function match(record,score){
  const rule=E.matchRecord(record),status=E.intentStatus(record.intent),basis=status.usable?status.cleaned:E.absent(record.major)?'':record.major;
  const candidates=E.parseFeedback(record.feedback),items=candidates.filter(c=>c.job&&c.department);
  const result={...record,candidates,basis,basisType:status.usable?'意向':basis?'专业':'缺失',selected:null,reason:'',scores:{}};
  if(!items.length)return {...result,reason:'无可用部门和岗位'};
  const exact=status.usable?items.filter(c=>E.normalize(c.job)===E.normalize(basis)):[];
  if(exact.length)return {...result,selected:earliest(exact).index,reason:'同名意向取最早'};
  if(!basis)return {...result,selected:earliest(items).index,reason:'缺少专业及有效意向，按最早反馈选择'};
  if(items.length===1)return {...result,selected:items[0].index,reason:'唯一可用反馈'};
  const level=c=>rule.candidates.find(o=>o.index===c.index)?.level??0,max=Math.max(...items.map(level));
  if(max>=3)return {...result,selected:earliest(items.filter(c=>level(c)===max)).index,reason:'明确职能或领域优先，同类取最早'};
  const shortlist=max===2?items.filter(c=>level(c)===2):items;
  const scores=await score(basis,shortlist);
  if(!Array.isArray(scores)||scores.length!==shortlist.length||scores.some(s=>typeof s!=='number'||!Number.isFinite(s)))throw Error('模型返回分数不完整，本次处理停止');
  shortlist.forEach((c,i)=>result.scores[c.index]=scores[i]);
  const highest=Math.max(...scores);
  // 忽略浮点推理约1e-7的数值扰动，不让设备或批次改变并列项的先后。
  const top=earliest(shortlist.filter(c=>highest-result.scores[c.index]<=1e-6));
  const peers=shortlist.filter(c=>c.job===top.job&&c.business===top.business);
  return {...result,selected:earliest(peers).index,reason:'语义补充排序，同岗位同业务取最早'};
 }
 function explain(r){
  const c=r.candidates.find(c=>c.index===r.selected),items=r.candidates.filter(c=>c.job&&c.department);
  if(!c)return '反馈中没有可识别的部门和岗位，未生成匹配。';
  const basis=r.basis?`依据${r.basisType}“${r.basis}”`:'未提供有效意向和专业';
  const choice=`“${c.department}／${c.job}”`,time=c.timestamp===null?'按原文先后顺序选择':`选择最早有效反馈（${c.time}）`;
  if(r.reason==='同名意向取最早'){
   const same=items.filter(o=>E.normalize(o.job)===E.normalize(r.basis));
   return `${basis}；反馈职位与意向名称一致${same.length>1?`，在${same.length}条同名反馈中${time}`:'，优先于其他职位'}，选定${choice}。`;
  }
  if(!r.basis)return `${basis}；在${items.length}条可用反馈中${time}，选定${choice}。`;
  if(r.reason==='唯一可用反馈')return `${basis}；仅有1条可用反馈，直接保留${choice}，未进行多岗位比较。`;
  if(r.reason==='明确职能或领域优先，同类取最早'){
   const rule=E.matchRecord(r),assessed=rule.candidates.find(o=>o.index===c.index),max=Math.max(...rule.candidates.filter(o=>o.job&&o.department).map(o=>o.level));
   const peers=rule.candidates.filter(o=>o.job&&o.department&&o.level===max);
   return `${basis}；规则判断：${assessed.reason}${assessed.supplement?'（关联来自补充说明，输出仍为原反馈主岗位）':''}。${peers.length>1?`在${peers.length}条最高关联反馈中${time}，`:'优先该职能或领域，'}选定${choice}。`;
  }
  const peers=items.filter(o=>Object.hasOwn(r.scores||{},o.index)&&o.job===c.job&&o.business===c.business),compared=Object.keys(r.scores||{}).length;
  return `${basis}；用本地语义模型比较${compared}条候选反馈的岗位、部门和业务，确定“${c.job}”方向${peers.length>1?`，再在同岗位同业务的反馈中${time}`:''}，选定${choice}。`;
 }
 const api={match,explain,earliest,version:'2.0.0+portfolio.3'};root.FinalMatcher=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
