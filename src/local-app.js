/* © 2026 贵毅_TUFE · 来源：https://github.com/liguiyi-hash/job-feedback-matcher · 自有代码保留所有权利，见LICENSE。 */
/* 自动结果版：一次导入、自动选定、直接导出。 */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), E=MatchEngine, D=DataIO;
 let workbook=null, input=null, completed=[], busy=false, stop=false, pageIndex=0;
 const error=e=>{$('error').textContent=e?.message||String(e);};
 function collect(){
  const names=$('sheet').value==='*'?workbook.SheetNames:[$('sheet').value];
  const override=names.length===1?Object.fromEntries(['major','intent','feedback'].map(k=>[k,Number($('map-'+k).value)])):null;
  const n=Number($('header').value);if(!Number.isInteger(n)||n<1)throw Error('表头行必须为正整数');
  return D.collect(XLSX,workbook,names,n,override);
 }
 function mapping(){
  $('mapping').replaceChildren();if(!workbook)return;
  if($('sheet').value==='*'){$('mapping').textContent='全部工作表分别自动识别列。如需手动指定列，请选择单个工作表。';return;}
  const sh=D.readSheet(XLSX,workbook,$('sheet').value,Number($('header').value));
  for(const [key,title] of [['major','专业列'],['intent','意向岗位列'],['feedback','反馈记录列']]){
   const label=document.createElement('label');label.textContent=title;const sel=document.createElement('select');sel.id='map-'+key;
   [-1,...sh.headers.map((_,i)=>i)].forEach(i=>{const op=document.createElement('option');op.value=i;op.textContent=i<0?'未提供':sh.headers[i];sel.append(op);});
   sel.value=sh.columns[key];label.append(sel);$('mapping').append(label);
  }
 }
 $('file').onchange=async()=>{
  if(busy)return;try{
   $('error').textContent='';completed=[];render();workbook=null;$('run').disabled=true;$('export').disabled=true;
   const f=$('file').files[0];if(!f)return;
   workbook=XLSX.read(await f.arrayBuffer(),{type:'array'});$('sheet').replaceChildren();
   [['*','全部工作表'],...workbook.SheetNames.map(n=>[n,n])].forEach(([v,t])=>{const op=document.createElement('option');op.value=v;op.textContent=t;$('sheet').append(op);});
   $('sheet').value=workbook.SheetNames.length===1?workbook.SheetNames[0]:'*';mapping();$('run').disabled=false;
   $('status').textContent=`已载入 ${f.name}，共 ${workbook.SheetNames.length} 个工作表。请确认表头行与列。`;
  }catch(e){error(e);}
 };
 $('sheet').onchange=mapping;$('header').onchange=mapping;
 function state(value){busy=value;['file','header','sheet','run'].forEach(id=>$(id).disabled=value);document.querySelectorAll('#mapping select').forEach(x=>x.disabled=value);$('cancel').disabled=!value;$('export').disabled=value||!completed.length;}
 $('cancel').onclick=()=>{stop=true;$('status').textContent='正在完成当前候选人，随后停止。';};
 async function score(basis,options){
  const response=await fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':SESSION_TOKEN},body:JSON.stringify({basis,options:options.map(({job,department,business})=>({job,department,business}))})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'本地模型请求失败');return data.scores;
 }
 $('run').onclick=async()=>{
  try{input=collect();if(!input.records.length)throw Error('没有候选人记录');
   state(true);stop=false;completed=[];$('error').textContent='';$('progress').max=input.records.length;$('progress').value=0;render();
   for(const r of input.records){if(stop)break;
    $('status').textContent=`正在处理 ${completed.length+1} / ${input.records.length}；首次推理需要加载模型。`;
    completed.push(await FinalMatcher.match(r,score));$('progress').value=completed.length;
    if(completed.length%20===0)render();
   }
   $('status').textContent=`${stop?'已停止':'匹配完成'}：${completed.length} / ${input.records.length} 条。可直接导出匹配结果。`;render();
  }catch(e){error(e);$('status').textContent=`处理未完成，已完成 ${completed.length} 条；可导出已完成部分，结果会注明处理数量。`;render();}
  finally{state(false);}
 };
 $('previous').onclick=()=>{pageIndex--;render();};$('next').onclick=()=>{pageIndex++;render();};
 function render(){
  pageIndex=Math.max(0,Math.min(pageIndex,Math.ceil(completed.length/200)-1));
  $('previous').disabled=pageIndex===0;$('next').disabled=(pageIndex+1)*200>=completed.length;
  $('rows').replaceChildren();for(const r of completed.slice(pageIndex*200,(pageIndex+1)*200)){
   const tr=document.createElement('tr'),cell=t=>{const td=document.createElement('td');td.textContent=t;tr.append(td);return td;};
   cell(`${r.sheetName} · 第 ${r.row} 行\n${r.displayName}`);cell(`${r.basisType}：${r.basis||'未提供'}`);
   const c=r.candidates.find(c=>c.index===r.selected);cell(c?.department||'无可用反馈');cell(c?.job||'');cell(c?.interviewer||'');
   $('rows').append(tr);
  }$('count').textContent=`已完成 ${completed.length} 条，当前第 ${pageIndex+1} 页，每页至多 200 条；Excel 导出包含全部已完成记录。`;
 }
 $('export').onclick=()=>{
  try{
   const headers=['候选人','匹配部门','匹配岗位','面试官','专业','原始意向','反馈时间','来源工作表','原始行号','选中反馈原文','处理状态','版本水印','结果批次'];
   const batchId=crypto.randomUUID();
   const rows=completed.map(r=>{const c=r.candidates.find(c=>c.index===r.selected);return [r.displayName,c?.department||'',c?.job||'',c?.interviewer||'',r.major,r.intent,c?.time||'',r.sheetName,r.row,c?.raw||'',c?'已自动选择':'无可用部门和岗位','贵毅_TUFE · 2.0.0+portfolio.1',batchId];});
   const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=[18,36,29,35,30,40,25,14,13,100,24,35,42].map(wch=>({wch}));
   ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length,c:headers.length-1}})};
   const wb=XLSX.utils.book_new();wb.Props={Author:'贵毅_TUFE',Title:'岗位反馈匹配结果',Comments:'© 2026 贵毅_TUFE · '+batchId};XLSX.utils.book_append_sheet(wb,ws,'匹配结果');
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['程序信息','内容'],['署名','贵毅_TUFE'],['版本','2.0.0+portfolio.1'],['GitHub来源','https://github.com/liguiyi-hash/job-feedback-matcher'],['构建指纹',document.getElementById('build-fingerprint').textContent],['结果批次',batchId],['导出时间',new Date().toISOString()]]),'程序信息');
   if(completed.length!==input.records.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['处理情况','已完成','总记录'],['部分完成，未处理记录未导出',completed.length,input.records.length]]),'处理情况');
   XLSX.writeFile(wb,completed.length===input.records.length?'候选人岗位匹配结果.xlsx':'候选人岗位匹配结果_部分完成.xlsx');
  }catch(e){error(e);}
 };
})();
