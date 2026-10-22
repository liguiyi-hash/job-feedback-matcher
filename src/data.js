/* © 2026 贵毅_TUFE · 来源：https://github.com/liguiyi-hash/job-feedback-matcher · 自有代码保留所有权利，见LICENSE。 */
/* 工作簿读取与上下文提示。历史结果、姓名、地点均不参与相关性排序。 */
(function(root){
 'use strict';
 const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.MatchEngine;
 const text=v=>String(v??'').trim();
 function detectColumns(headers){
  const find=re=>headers.findIndex(h=>re.test(h));
  let feedback=find(/^(反馈记录|部门反馈|我们反馈的岗位|部门回复|反馈原文)$/);
  if(feedback<0)feedback=find(/反馈(记录|原文|内容)|部门回复/);
  return {major:find(/专业/),intent:find(/意向|志愿|投递职[位务]|应聘职[位务]|申请职[位务]|目标岗[职位]|求职岗[职位]/),feedback,
   name:find(/^(姓名|候选人姓名|求职者姓名)$/),expectedLocation:find(/期望工作地点|意向城市|期望地点|期望城市/),
   historyJob:find(/^反馈岗位$/),historyDepartment:find(/^反馈部门$/),historyLocation:find(/^反馈地点$/),historyInterviewer:find(/^面试官$/)};
 }
 function readSheet(X,workbook,name,headerRow=1){
  const ws=workbook.Sheets[name],range=ws?.['!ref']?X.utils.decode_range(ws['!ref']):null,first=Number(headerRow)-1;
  if(!range||first<0||!Number.isInteger(first)||first>range.e.r)return {name,headers:[],rows:[],blankRows:0,columns:detectColumns([])};
  const all=X.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,blankrows:true,range:{s:{r:0,c:0},e:range.e}});
  const seen=new Map(),headers=Array.from({length:range.e.c+1},(_,i)=>{
   const h=text(all[first]?.[i])||`未命名列 ${X.utils.encode_col(i)}`,n=(seen.get(h)||0)+1;seen.set(h,n);return n===1?h:`${h}（${n}）`;
  });
  const rows=all.slice(first+1).map((v,i)=>({source:v,row:i+first+2})).filter(({source})=>source.some(v=>text(v)));
  return {name,headers,rows,blankRows:all.length-first-1-rows.length,columns:detectColumns(headers)};
 }
 function collect(X,workbook,names,headerRow=1,overrides=null){
  const allHeaders=[],records=[],sheets=[];
  names.forEach(name=>{
   const sh=readSheet(X,workbook,name,headerRow),columns=overrides?{...sh.columns,...overrides}:sh.columns;
   if(columns.major===columns.intent)columns.intent=-1;
   sh.headers.forEach(h=>{if(!allHeaders.includes(h))allHeaders.push(h);});
   sh.rows.forEach(({source,row})=>{
    const get=k=>columns[k]<0?'':text(source[columns[k]]);
    records.push({id:names.length===1?row:`${workbook.SheetNames.indexOf(name)}:${row}`,row,sheetName:name,source,sourceHeaders:sh.headers,
     major:get('major'),intent:get('intent'),feedback:columns.feedback<0?'':String(source[columns.feedback]??''),displayName:get('name'),expectedLocation:get('expectedLocation'),
     historical:{job:get('historyJob'),department:get('historyDepartment'),location:get('historyLocation'),interviewer:get('historyInterviewer')},
     missingFeedbackColumn:columns.feedback<0});
   });
   sheets.push({name,records:sh.rows.length,blankRows:sh.blankRows,missingFeedbackColumn:columns.feedback<0});
  });
  return {headers:allHeaders,records,sheets};
 }
 const normDept=v=>E.normalize(v).replace(/[+＋/／]/g,'');
 function compareHistory(r){
  const h=r.historical||{};
  if(!text(h.job)&&!text(h.department))return {status:'无历史选择',candidates:[]};
  const options=r.candidates.filter(c=>(!text(h.job)||E.normalize(c.job)===E.normalize(h.job))&&(!text(h.department)||normDept(h.department).endsWith(normDept(c.department))));
  if(!options.length)return {status:'历史结果无法定位原反馈',candidates:[]};
  return {status:options.some(c=>c.index===r.selected)?'与历史选择一致':'与历史选择不同',candidates:options.map(c=>c.index),ambiguous:options.length>1};
 }
 function cities(value){
  return text(value).replace(/(?:工作地点|地点)[:：]?/g,'').split(/[,，、/／;；+＋\s]+/).map(x=>x.replace(/(?:市|省|自治区|特别行政区)$/,'')).filter(Boolean);
 }
 function locationStatus(r){
  if(!r.expectedLocation||/不限|全国|待定/.test(r.expectedLocation))return '';
  const c=r.candidates.find(c=>c.index===r.selected);if(!c)return '';
  if(!text(c.location))return '反馈地点缺失，需核对期望地点';
  const expected=cities(r.expectedLocation),offered=cities(c.location);
  if(/不限|全国|待定/.test(c.location))return '反馈地点不具体，需核对期望地点';
  return expected.some(x=>offered.includes(x))?'':'反馈地点与期望地点未重合，需沟通确认（不改变岗位排序）';
 }
 function finalWarnings(r){
  return [...new Set([...E.finalWarnings(r),...(r.missingFeedbackColumn?['该工作表没有反馈记录列，未生成岗位']:[]),...(locationStatus(r)?[locationStatus(r)]:[])])];
 }
 const api={detectColumns,readSheet,collect,compareHistory,locationStatus,finalWarnings,match:(r,rules=[])=>E.matchRecord(r,rules)};
 root.DataIO=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
