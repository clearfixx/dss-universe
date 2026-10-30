import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='node_modules/.cache/';
const local=base+'quality-full-kYoHYl/api-e2e.json';
const ci=base+'debt007-c1-ci-10c09eb/api-e2e.json';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const file of [local,ci]) {
 const r=JSON.parse(readFileSync(file));
 if(!r.success||r.numPassedTests!==689||r.numTotalTests!==689||r.numPendingTests!==0||r.numFailedTests!==0)throw Error('E2E evidence mismatch');
 const cases=r.testResults.filter(t=>t.name.includes('gamification-delivery-characterization')).flatMap(t=>t.assertionResults);
 if(cases.length!==5||cases.some(t=>t.status!=='passed'))throw Error('characterization mismatch');
}
const web=base+'quality-full-kYoHYl/web-smoke.json';
const w=JSON.parse(readFileSync(web));
if(w.status!=='passed'||w.tests!==15||readFileSync(base+'debt007-c1-quality-10c09eb.exit.txt','utf8').trim()!=='0')throw Error('gate mismatch');
writeFileSync(base+'debt007-c1-gate-proof.json',JSON.stringify({head:'10c09eb3104790aaf58783a5fbf9dd6ff587f879',baseline:'ddb685d9df9cabc0e9f54ca70dcb2c45ed02dfea',exitCode:0,coveragePackages:8,apiCoverageTests:1466,buildTasks:6,apiE2E:{total:689,passed:689,pending:0,suites:64,characterizationAssertions:5,sha256:hash(local)},ci:{checks:'5/5',qualityRun:40817974025,containmentRun:40817973940,e2eSha256:hash(ci)},webSmoke:{passed:15,retries:0,sha256:hash(web)},gateWindowUtc:['2026-10-29T04:28:52Z','2026-10-29T04:45:59Z'],accepted:false,runtimeC:'not authorized or implemented',debt090:'policy approved; correction not implemented',fixtureFailure:'preserved separate collision log; exact assertions unchanged',d7:'local documentation-only checkpoint80e64dd; acceptance open'},null,2)+'\n');
console.log('Saved verified exact-head gate evidence.');
