import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const cache='node_modules/.cache/';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!=='834ea0b8fb06cb6cc0e0e4ce8ab96b0d09f01609'||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('head/clean mismatch');
const local=cache+'quality-full-dKEW2S/api-e2e.json';
const ci=cache+'debt091-ci-834ea0b/api-e2e.json';
for(const file of [local,ci]) {
 const r=JSON.parse(readFileSync(file));
 if(!r.success||r.numTotalTests!==688||r.numPassedTests!==688||r.numPendingTests!==0||r.numFailedTests!==0||r.numTotalTestSuites!==64)throw Error('incomplete E2E');
 if(r.testResults.flatMap(t=>t.assertionResults).some(t=>t.status!=='passed'))throw Error('nonpassed assertion');
}
const web=cache+'quality-full-dKEW2S/web-smoke.json';
const browser=JSON.parse(readFileSync(web));
if(browser.status!=='passed'||browser.tests!==15||readFileSync(cache+'debt091-quality-834ea0b.exit.txt','utf8').trim()!=='0')throw Error('terminal gate mismatch');
const pending=JSON.parse(readFileSync(cache+'debt091-verification-pending.json'));
const log=statSync(cache+'debt091-quality-834ea0b.log');
const result={head,baseline:'ddb685d9df9cabc0e9f54ca70dcb2c45ed02dfea',accepted:false,exitCode:0,coveragePackages:8,apiCoverageTests:1466,buildTasks:6,apiE2E:{passed:688,total:688,pending:0,suites:64,sha256:hash(local)},ci:{checks:'5/5',qualityRun:40835317524,containmentRun:40835317484,e2eSha256:hash(ci),actualBootstrapRegressions:'six groups passed in quality-policy step'},webSmoke:{passed:15,retries:0,sha256:hash(web)},gateWindowUtc:[log.birthtime.toISOString(),log.mtime.toISOString()],uninterrupted:false,sleepEvidence:pending.currentRunSleepEvidence,redEvidence:'debt091-layer-masking-before.log',greenEvidence:'debt091-layer-masking-after.log',previousRun:'exit0 but superseded and changed scripts mid-flight; not exact-head acceptance',currentDevCompatibility:'three local file views pass pure guard, no DB connection or mutation',d7:'open; no runtime candidate imported into review branch'};
writeFileSync(cache+'debt091-gate-proof-834ea0b.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
