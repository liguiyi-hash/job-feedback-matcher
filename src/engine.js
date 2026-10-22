/* © 2026 贵毅_TUFE · 来源：https://github.com/liguiyi-hash/job-feedback-matcher · 自有代码保留所有权利，见LICENSE。 */
/* 岗位反馈匹配助手：本地、确定性的初步方向匹配。规则版本 1.2 */
(function (root) {
  'use strict';
  const normalize = v => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[\s、，,。；;（）()\[\]：:／/\\-]/g, '');
  const absent = v => !normalize(v) || /^(无|暂无|未填|不限|不明确|待定|无明确意向|未提供|na|n\/a|null|undefined|-|—)$/i.test(String(v ?? '').trim());
  const includes = (s, words) => words.some(w => s.includes(normalize(w)));
  function cleanIntent(value) {
    return String(value??'').normalize('NFKC')
      .replace(/\((?:博士|硕士|本科|应届生)?(?:招聘|校招|校园招聘)\)/g,'')
      .replace(/[-_－—]?\s*campus(?:\s*[-_－—]?\s*20\d{2})?/gi,'')
      .replace(/[-_－—](?:校招|校园招聘)(?:[-_－—]?20\d{2})?/g,'')
      .replace(/^(?:第一志愿|第二志愿|求职意向|意向岗位|意向)\s*[:：]?\s*/,'').trim();
  }
  function intentStatus(value) {
    const cleaned=cleanIntent(value);
    if(absent(cleaned))return {usable:false,cleaned:'',reason:''};
    const channel=normalize(cleaned).replace(/20\d{2}/g,'');
    if(/^(双选会简历|双选会|校园招聘|校招|校招简历|人才库|简历库|通用简历|校园简历|应届生简历|社会招聘|简历投递|简历)$/.test(channel))
      return {usable:false,cleaned:'',reason:'投递职位为渠道／简历池名称，不是明确岗位意向'};
    return {usable:true,cleaned,reason:''};
  }
  // 从细分职能到宽泛方向依次判断。AI、机器人等修饰词不能覆盖前端、测试或硬件职能。
  const intentRules = [
    {name:'自动驾驶Linux与嵌入式',input:['自动驾驶Linux','自动驾驶嵌入式','智驾Linux','智驾嵌入式'],direct:['自动驾驶Linux','自动驾驶嵌入式','智驾Linux','智驾嵌入式'],related:['Linux','嵌入式软件','C++软件'],specific:'自动驾驶／智能驾驶／智驾／ADS'},
    {name:'自动驾驶仿真测试',input:['自动驾驶仿真测试'],direct:['自动驾驶仿真测试','智能驾驶仿真','智驾仿真'],related:['仿真','测试工程','测试开发'],contextJobs:['仿真'],specific:'自动驾驶／智能驾驶／智驾／ADS'},
    {name:'自动驾驶软件测试',input:['自动驾驶软件测试','自动驾驶测试'],direct:['自动驾驶软件测试','自动驾驶测试','智驾测试'],related:['软件测试','测试工程','测试开发','整车测试'],specific:'自动驾驶／智能驾驶／智驾／ADS'},
    {name:'自动驾驶系统',input:['自动驾驶系统'],direct:['自动驾驶系统','智能驾驶系统','智驾系统'],related:['系统工程','系统集成'],specific:'自动驾驶／智能驾驶／智驾／ADS'},
    {name:'自动驾驶AI模型',input:['自动驾驶AI模型','自动驾驶模型','智驾AI模型'],direct:['自动驾驶AI模型','自动驾驶模型','自动驾驶算法','智能驾驶算法','智驾算法'],related:['AI工程','算法工程','机器学习','深度学习'],specific:'自动驾驶／智能驾驶／智驾／ADS'},
    {name:'自动驾驶算法',input:['自动驾驶端到端算法','自动驾驶应用算法','自动驾驶算法','智能驾驶算法'],direct:['自动驾驶端到端算法','自动驾驶应用算法','自动驾驶算法','智能驾驶算法','智驾算法'],related:['算法工程','AI工程'],specific:'自动驾驶／智能驾驶／智驾／ADS'},
    {name:'光学系统',input:['光学系统'],direct:['光学系统'],related:['系统工程','光学工程'],specific:'光学'},
    {name:'光学',input:['光学','光电设计'],direct:['光学','光电设计','光学仿真'],related:['光电','机器视觉','图像处理'],specific:'光学'},
    {name:'射频',input:['射频','天线'],direct:['射频','天线','微波'],related:['EMC','电子测试','硬件'],specific:'射频／天线'},
    {name:'FPGA',input:['FPGA'],direct:['FPGA','可编程逻辑'],related:['硬件','数字电路','逻辑设计'],specific:'FPGA'},
    {name:'数据分析',input:['数据分析','数据科学'],direct:['数据分析','数据科学','商业分析'],related:['数据运营','数据工程','数据平台','AI工程','算法工程','Python'],specific:'数据分析'},
    {name:'策划运营',input:['策划运营','运营工程','策划工程'],direct:['运营工程','产品策划','策划运营','运营专员'],related:['项目管理','项目经理','研发管理','体系改进'],specific:'策划运营'},
    {name:'交互体验',input:['交互体验','交互设计','用户体验'],direct:['交互体验','交互设计','用户体验','UX设计','UI设计'],related:['工业设计','产品经理','产品设计'],specific:'交互／用户体验'},
    {name:'产品管理',input:['产品经理','产品管理'],direct:['产品经理','产品策划'],related:['产品工程','项目管理','项目经理','运营工程'],specific:'产品管理'},
    {name:'供应链',input:['供应链','供应商管理','采购'],direct:['供应链','供应商管理','采购'],related:['供应商质量','工业工程','物流'],specific:'供应链'},
    {name:'人力资源',input:['人力资源','人力运营','招聘专员','人事'],direct:['人力资源','人力运营','招聘','人事'],related:['培训','组织发展']},
    {name:'财务',input:['财务','会计','审计'],direct:['财务','会计','审计','税务'],related:['成本管理','资产运营']},
    {name:'市场营销',input:['市场营销','市场专员','营销'],direct:['市场专员','市场营销','营销','市场推广'],related:['产品策划','运营工程','产品经理']},
    {name:'资产管理',input:['资产管理','资产运营'],direct:['资产管理','资产运营'],related:['财务运营']},
    {name:'知识产权',input:['知识产权','专利'],direct:['知识产权','专利'],related:['法务'],specific:'知识产权'},
    {name:'前端开发',input:['前端','Web开发'],direct:['前端','Web开发'],related:['软件工程','AI工程','后端']},
    {name:'后端开发',input:['后端','Java','服务端'],direct:['后端','Java开发','Java工程','服务端'],related:['软件工程','Python','C++']},
    {name:'测试开发',input:['测试开发'],direct:['测试开发'],related:['软件测试','测试工程','持续集成','产品测试']},
    {name:'软件测试',input:['软件测试'],direct:['软件测试'],related:['测试开发','测试工程','持续集成']},
    {name:'整车测试',input:['整车测试','智能汽车测试'],direct:['整车测试','智能汽车测试'],related:['HIL','测试开发','测试工程','产品测试']},
    {name:'测试',input:['测试工程师','测试类'],direct:['测试工程师','测试开发','软件测试','电子测试','产品测试','整车测试'],related:['HIL','可靠性','持续集成']},
    {name:'机器人硬件',input:['机器人硬件'],direct:['机器人硬件','机器人电子'],related:['硬件工程','电气系统设计','电子电气架构','机电工程'],specific:'机器人'},
    {name:'机器人机电',input:['机器人机电'],direct:['机器人机电','机电工程'],related:['电气系统设计','智能制造设备','硬件工程','机械结构','电子电气架构'],specific:'机器人'},
    {name:'机器人算法',input:['机器人算法'],direct:['机器人算法','具身智能'],related:['算法工程','AI工程','仿真'],specific:'机器人'},
    {name:'机器人系统',input:['机器人系统'],direct:['机器人系统','具身智能'],related:['系统工程','机器人','电气系统设计'],specific:'机器人'},
    {name:'具身智能',input:['具身智能'],direct:['具身智能','机器人系统','机器人算法'],related:['算法工程','AI工程','机器人','仿真'],specific:'机器人／具身智能'},
    {name:'热管理算法',input:['热管理算法'],direct:['热管理算法','热控制算法'],related:['算法工程','动力系统仿真','动力仿真','热管理系统'],specific:'热管理'},
    {name:'热管理',input:['热管理','热设计'],direct:['热管理','热设计','热仿真','热控制'],related:['动力系统仿真','动力仿真','热测试','标定'],specific:'热管理'},
    {name:'BMS软件',input:['BMS软件','电池管理软件'],direct:['BMS软件','电池管理软件'],related:['嵌入式软件','LinuxBSP','控制软件','C++软件'],specific:'BMS／电池管理'},
    {name:'机械结构',input:['机械结构','结构设计','结构工程','机械设计'],direct:['机械结构','结构设计','结构工程','智造机械结构'],related:['智能制造设备','设备系统','机电工程','仿真','电池Pack设计']},
    {name:'AI基础设施',input:['AI基础设施'],direct:['AI基础设施','机器学习平台','训练平台','推理平台'],related:['AI工程','Linux','后端','云平台','数据平台'],specific:'AI基础设施'},
    {name:'AI应用',input:['AI应用','AI大模型','大模型应用'],direct:['AI应用','AI大模型','大模型应用','人工智能应用'],related:['AI工程','算法工程','Python','后端'],specific:'AI应用'},
    {name:'信息安全',input:['信息安全','网络安全','网络空间安全'],direct:['信息安全','网络安全','安全攻防','渗透测试'],related:['嵌入式','通信研发','软件测试']},
    {name:'标定',input:['标定'],direct:['标定'],related:['控制算法','算法工程','测试开发','测试工程'],specific:'标定'},
    {name:'功能材料',input:['功能材料','材料工程'],direct:['材料研发','材料工程','功能材料','高分子','材料测试'],related:['智造研发工艺','工艺研发','质量工程','可靠性'],specific:'材料'},
    {name:'汽车电子',input:['汽车电子'],direct:['汽车电子','车载电子','电子电气架构','嵌入式软件'],related:['功能安全','系统工程','车载网络','硬件工程']},
    {name:'研发管理',input:['研发管理'],direct:['研发管理','项目管理','项目经理'],related:['产品工程','产品经理']},
    {name:'产品支持',input:['产品支持'],direct:['产品支持','技术支持','应用支持'],related:['产品工程','应用工程','系统工程'],specific:'产品支持'},
    {name:'驻地支持',input:['驻地支持','现场支持'],direct:['驻地支持','现场支持','技术支持'],related:['项目管理','项目经理','产品工程'],specific:'现场支持'},
    {name:'嵌入式',input:['嵌入式','单片机','MCU'],direct:['嵌入式','单片机','MCU'],related:['C++','Linux','Android','软件工程']},
    {name:'C++开发',input:['C++'],direct:['C++'],related:['嵌入式','软件工程']},
    {name:'Python开发',input:['Python'],direct:['Python'],related:['后端','AI工程','算法工程']},
    {name:'Android开发',input:['Android'],direct:['Android'],related:['嵌入式','软件工程']},
    {name:'Linux开发',input:['Linux'],direct:['Linux'],related:['嵌入式','软件工程']},
    {name:'通信',input:['通信研发','车载网络','通信工程'],direct:['通信研发','车载网络','通信工程'],related:['嵌入式','EMC','电子测试']},
    {name:'质量',input:['质量'],direct:['质量工程','产品质量','供应商质量','研发质量'],related:['可靠性','测试工程','工艺']},
    {name:'项目管理',input:['项目管理','项目经理'],direct:['项目管理','项目经理'],related:['研发管理']},
    {name:'硬件',input:['硬件'],direct:['硬件'],related:['电力电子','电子测试']},
    {name:'仿真',input:['仿真'],direct:['仿真'],related:['算法工程','整车测试']},
    {name:'人工智能',input:['人工智能','AI工程','AI开发','AI算法','机器学习','深度学习'],direct:['AI工程','AI开发','AI大模型','大模型应用','机器学习','深度学习','算法工程'],related:['Python','后端','测试开发']},
    {name:'算法',input:['算法'],direct:['算法'],related:['AI工程','Python','仿真']},
    {name:'软件开发',input:['软件开发','软件工程','软件类'],direct:['软件工程','后端','前端','嵌入式','C++','Python','Android','Linux','软件测试','测试开发','AI工程','算法工程'],related:['系统工程','通信研发']},
    {name:'系统工程',input:['系统工程'],direct:['系统工程'],related:['系统设计','系统集成']},
  ];
  // 每一组是可解释的方向关联，不表示录用或胜任概率。
  const profiles = [
    {name:'信息安全', input:['网络空间安全','信息安全','网络安全'], direct:['信息安全','网络安全','安全攻防','渗透测试'], related:['嵌入式','通信研发','车载网络','后端','软件测试','测试开发']},
    {name:'工业工程', input:['工业工程'], direct:['工业工程','IE工程'], related:['工艺','制造','质量','项目管理','项目经理']},
    {name:'动力工程', input:['动力工程','能源与动力','热能','动力机械'], direct:['动力系统仿真','动力仿真','热管理','热设计','动力系统设计'], related:['仿真建模','新能源','系统工程','测试','机械结构']},
    {name:'机械工程', input:['机械','机电'], direct:['机械结构','机械设计','结构设计','智能制造设备','设备研发','设备开发','动力仿真','动力系统仿真','智造研发工艺'], related:['仿真','工艺','整车测试','测试开发','电气系统设计','供应商质量','研发质量']},
    {name:'人工智能', input:['人工智能','机器学习','大数据'], direct:['AI工程','AI大模型','大模型应用','机器学习','深度学习','算法工程','数据科学'], related:['后端','Python','软件','测试开发']},
    {name:'计算机与软件', input:['软件工程','计算机','计算科学'], direct:['嵌入式软件','软件工程','后端开发','前端开发','C++','Android','Linux','Python','AI工程','AI大模型','软件测试','测试开发','算法工程'], related:['系统工程','通信研发','信息安全','测试工程']},
    {name:'通信工程', input:['通信','光电信息'], direct:['通信研发','车载网络','通信工程'], related:['嵌入式','电子测试','EMC','系统工程','硬件','信息安全']},
    {name:'控制与自动化', input:['控制工程','控制科学','自动化','交通信息工程'], direct:['嵌入式','控制算法','自动驾驶安全算法','控制系统','动力系统仿真','动力仿真'], related:['算法工程','仿真','C++','测试开发','车载网络','系统工程','功能安全','测试工程']},
    {name:'车辆工程', input:['车辆工程','汽车工程'], direct:['整车测试','电子电气架构','动力系统仿真','动力仿真','车载网络','HIL','底盘','车辆','智能汽车'], related:['系统工程','测试开发','仿真','算法工程','嵌入式']},
    {name:'电子信息', input:['电子信息','电子科学','微电子','集成电路','电气工程'], direct:['硬件','电力电子','电子测试','电子电气架构','集成电路','嵌入式','通信研发','车载网络'], related:['软件工程','功能安全','信息安全','测试开发','系统工程','算法工程','EMC','FA工程']},
    {name:'材料与化学', input:['材料','化学','化工'], direct:['材料研发','材料工程','化学研发','化工工艺','高分子','材料测试'], related:['供应商质量','研发质量','工艺研发','智造研发工艺','失效分析']},
    {name:'仪器工程', input:['仪器','测控'], direct:['测控','仪器','电子测试','硬件'], related:['整车测试','嵌入式','测试开发','系统工程','功能安全']},
    {name:'财务会计', input:['会计','财务','审计'], direct:['会计','财务','审计','税务'], related:['财务分析','成本管理']},
    {name:'人力资源', input:['人力资源','劳动关系'], direct:['人力资源','招聘','薪酬','人事'], related:['培训','组织发展']},
    {name:'工业设计', input:['工业设计','产品设计'], direct:['工业设计','外观设计','交互设计','产品设计师'], related:['研发质量','产品质量']},
  ];
  const labels = {0:'信息不足',1:'关联弱',2:'相近',3:'直接相关',4:'岗位一致'};
  function validTime(t) {
    const a = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!a) return null;
    const n=a.slice(1).map(v=>Number(v||0));
    const dt=new Date(Date.UTC(n[0],n[1]-1,n[2],n[3],n[4],n[5]));
    return dt.getUTCFullYear()===n[0] && dt.getUTCMonth()===n[1]-1 && dt.getUTCDate()===n[2] && n[3]<24 && n[4]<60 && n[5]<60 ? dt.getTime() : null;
  }
  function parseFeedback(text) {
    const source=String(text ?? '').replace(/\r\n?/g,'\n');
    if (!source.trim()) return [];
    const re=/^[ \t]*([^\n()（）]+?)[(（](\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)[)）]\s*[:：]/gm;
    const matches=[...source.matchAll(re)], items=[];
    if (!matches.length) return [parsePart(source, '', '', 0, '无法识别反馈人和时间，需核对格式')];
    if(source.slice(0,matches[0].index).trim()) items.push(parsePart(source.slice(0,matches[0].index),'','',0,'存在无法识别的前置反馈，需核对'));
    matches.forEach((m,i)=>{
      const raw=source.slice(m.index,i+1<matches.length?matches[i+1].index:source.length).trim();
      items.push(parsePart(raw,m[1].trim(),m[2],items.length, '', raw.slice(m[0].trimStart().length).trim()));
    });
    return items;
  }
  function parsePart(raw, author, time, index, warning, body) {
    // C++ 中的加号属于岗位名称，不能当作部门字段分隔符。
    const f=String(body ?? raw).replace(/C\+\+/gi,m=>m.replace(/\+/g,'\uE000')).split(/[+＋]/).map(x=>x.replace(/\uE000/g,'+').trim());
    const warnings=warning?[warning]:[];
    if(f.length<5) warnings.push('反馈字段不完整，需核对原文');
    const timestamp=validTime(time);
    if(timestamp===null && !warning) warnings.push('反馈时间无效，无法可靠比较先后');
    return {index,raw,author,time,timestamp,business:f[0]||'',department:f[1]||'',job:f[2]||'',location:f[3]||'',interviewer:f[4]||'',notes:f.slice(5).join('+'),warnings};
  }
  function assess(c,basis,type,custom=[]) {
    if(absent(basis)) return {level:0,label:labels[0],reason:'缺少明确意向和专业，无法判断相关性',supplement:false};
    const input=normalize(type==='意向'?cleanIntent(basis):basis), title=normalize(c.job), notes=normalize(c.notes), combined=title+' '+notes;
    let best={level:1,reason:'现有岗位名称和补充说明未提供明确方向关联'};
    function offer(level,reason,supplement=false,caveat='') {
      if(level>best.level || (level===best.level && best.supplement && !supplement))best={level,reason,supplement,caveat};
    }
    for(const rule of custom) {
      if(rule.enabled!==false && includes(input,rule.inputs||[]) && includes(combined,rule.jobs||[])) {
        offer(Number(rule.level),`命中自定义规则：${rule.inputs.join('、')} → ${rule.jobs.join('、')}`,!includes(title,rule.jobs||[]));
      }
    }
    if(type==='意向') {
      if(input===normalize(cleanIntent(c.job)))offer(4,'去除招聘批次后，意向与反馈岗位名称一致');
      const rule=intentRules.find(r=>includes(input,r.input));
      const cleaned=input.replace(/(希望从事|开发工程师|工程师|想做|岗位|方向)$/g,'');
      const literal=rule?input:cleaned;
      if(literal.length>=2 && combined.includes(literal)) offer(3,'岗位名称或补充说明直接包含意向方向',!title.includes(literal));
      if(rule) {
        if(includes(combined,rule.direct))offer(3,`与${rule.name}意向直接对应`,!includes(title,rule.direct));
        else if(includes(combined,rule.related))offer(2,`与${rule.name}意向属于相近方向`,!includes(title,rule.related),rule.specific?`反馈未明确${rule.specific}细分方向，需核对`: '');
        if(rule.specific && includes(combined+' '+normalize(c.department)+' '+normalize(c.business),rule.specific.split('／')) && includes(combined,rule.contextJobs||rule.related))
          offer(3,`岗位职能相近，且反馈明确包含${rule.specific}方向`,!includes(title,rule.related));
      }
      // 未识别的方向可尝试学科关联，但不使用候选人的另一个专业。
      if(!rule) applyProfiles();
    } else applyProfiles();
    function applyProfiles() {
      // 优先具体专业，避免“机械自动化”“工业工程”等被泛词覆盖。
      const matched=profiles.filter(p=>includes(input,p.input));
      const specific=matched.find(p=>['信息安全','工业工程','动力工程','人工智能','工业设计'].includes(p.name));
      for(const p of specific?[specific]:matched) {
        if(includes(combined,p.direct)) offer(3,`与${p.name}方向直接关联`,!includes(title,p.direct));
        else if(includes(combined,p.related)) offer(2,`与${p.name}方向相近`);
      }
    }
    return {...best,label:labels[best.level],supplement:!!best.supplement};
  }
  function matchRecord(record,custom=[]) {
    const status=intentStatus(record.intent);
    const type=status.usable?'意向':absent(record.major)?'缺失':'专业';
    const basis=type==='意向'?status.cleaned:String(record.major??'').trim();
    const candidates=parseFeedback(record.feedback).map(c=>({...c,...assess(c,basis,type,custom)}));
    const ranked=[...candidates].sort((a,b)=>b.level-a.level || ((a.timestamp??Infinity)-(b.timestamp??Infinity)) || a.index-b.index);
    const recommended=ranked[0]?.index ?? null;
    const best=ranked[0], warnings=[];
    if(!best) warnings.push('没有部门反馈，无法选择');
    if(status.reason)warnings.push(status.reason+(type==='专业'?'；已改用专业匹配':''));
    if(absent(basis)) warnings.push('缺专业／意向，待核对');
    if(candidates.some(c=>c.warnings.length)) warnings.push('存在反馈格式或时间问题，需核对');
    const peers=best?ranked.filter(c=>c.level===best.level):[];
    if(peers.length>1 && peers.some(c=>c.timestamp===null)) warnings.push('同等相关反馈中有时间缺失，暂优先可识别时间；需核对');
    const choiceReason=!best?'没有可选反馈':`${best.reason}；${candidates.length===1?'仅有一条反馈':peers.length>1?'同等相关按最早有效反馈时间选择':'优先于其他相关程度较低的反馈'}`;
    return {...record,type,basis,intentNote:status.reason,candidates,recommended,selected:recommended,reason:choiceReason,warnings,reviewed:false,manual:false,note:''};
  }
  function finalWarnings(record) {
    const c=record.candidates.find(x=>x.index===record.selected);
    const w=[...record.warnings];
    if(c?.supplement) w.push('匹配依据来自补充说明，需核对实际岗位');
    if(c?.level===1) w.push('当前选中反馈关联弱');
    if(c?.level===2) w.push('仅有相近方向，建议核对岗位是否接受调剂');
    if(c?.caveat)w.push(c.caveat);
    if(c?.warnings.length) w.push(...c.warnings);
    return [...new Set(w)];
  }
  const api={normalize,absent,cleanIntent,intentStatus,parseFeedback,assess,matchRecord,finalWarnings,profiles,intentRules,labels,validTime,version:'1.2'};
  root.MatchEngine=api;
  if(typeof module!=='undefined') module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
