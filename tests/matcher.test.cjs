/* © 2026 贵毅_TUFE. 自有代码保留所有权利，见 LICENSE。 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const F=require('../src/final-engine.js');
const feedback='示例面试官甲(2026-01-02 10:00:00):示例业务+示例研发一部+软件工程师+示例城市+示例面试官甲\n示例面试官乙(2026-01-01 10:00:00):示例业务+示例研发二部+软件工程师+示例城市+示例面试官乙';
test('意向优先于专业，同名反馈选择最早',async()=>{const r=await F.match({major:'机械工程',intent:'软件工程师',feedback},()=>{throw Error('不应调用模型')});assert.equal(r.candidates.find(c=>c.index===r.selected).department,'示例研发二部');});
test('无依据选择最早反馈',async()=>{const r=await F.match({major:'',intent:'',feedback},()=>[]);assert.equal(r.candidates.find(c=>c.index===r.selected).department,'示例研发二部');});
test('空反馈不虚构岗位',async()=>{const r=await F.match({major:'计算机',intent:'软件工程师',feedback:''},()=>[]);assert.equal(r.selected,null);});
test('未覆盖的新方向使用语义评分',async()=>{let called=false;const f='示例甲(2026-01-01 10:00:00):示例业务+示例一部+水声信号研究员+示例城市+示例甲\n示例乙(2026-01-02 10:00:00):示例业务+示例二部+海洋探测研究员+示例城市+示例乙';const r=await F.match({major:'',intent:'水下声学研究',feedback:f},async(_b,o)=>{called=true;return o.map((_,i)=>i);});assert.ok(called);assert.equal(r.selected,1);});
test('不接受不完整模型响应',async()=>{const f=feedback.replaceAll('软件工程师','示例未知岗位');await assert.rejects(F.match({major:'',intent:'示例新方向',feedback:f},async()=>[]),/分数不完整/);});
test('生成页面包含署名与构建指纹',()=>{const h=fs.readFileSync(path.join(__dirname,'../本地模型匹配.html'),'utf8');assert.ok(h.includes('贵毅_TUFE'));assert.ok(!h.includes('开发署名'));assert.ok(h.includes('owner-footer'));assert.ok(!h.includes('__BUILD_ID__'));assert.match(h, /id="build-fingerprint">[a-f0-9]{64}/);});

test('解释覆盖选择路径并引用实际选中岗位，不改变结果',async()=>{
 const acoustic='示例甲(2026-01-01 10:00:00):示例业务+示例一部+水声信号研究员+示例城市+示例甲\n示例乙(2026-01-02 10:00:00):示例业务+示例二部+海洋探测研究员+示例城市+示例乙';
 const cases=[
  [{intent:'软件工程师',major:'机械工程',feedback},/名称一致/],
  [{intent:'',major:'',feedback},/未提供有效意向和专业.*最早有效反馈/],
  [{intent:'示例新方向',major:'',feedback:feedback.split('\n')[0]},/仅有1条可用反馈.*未进行多岗位比较/],
  [{intent:'前端开发',major:'',feedback:feedback.replace('软件工程师','前端研发工程师').replace('软件工程师','产品测试工程师')},/规则判断.*前端开发/],
  [{intent:'水下声学研究',major:'',feedback:acoustic},/本地语义模型比较2条/],
  [{intent:'软件工程师',major:'',feedback:''},/没有可识别的部门和岗位.*未生成匹配/],
 ];
 for(const [record,expected] of cases){
  const r=await F.match(record,async(_b,options)=>options.map((_,i)=>i));
  const before=JSON.stringify(r),explanation=F.explain(r);
  assert.match(explanation,expected);assert.equal(JSON.stringify(r),before);
  const selected=r.candidates.find(c=>c.index===r.selected);
  if(selected)assert.ok(explanation.includes(`${selected.department}／${selected.job}`));
 }
});

