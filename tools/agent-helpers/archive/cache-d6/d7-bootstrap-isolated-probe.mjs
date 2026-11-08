import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseEnv} from 'node:util';
import {randomBytes} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {Client} from 'pg';
const source=readFileSync('scripts/bootstrap.mjs','utf8');
const manifest=JSON.parse(readFileSync('package.json','utf8'));
const virtualRoot=resolve('node_modules/.cache/bootstrap-virtual-no-io');
const virtualUrl=pathToFileURL(resolve(virtualRoot,'scripts/bootstrap.mjs')).href;
const code=source.replace(/^import .+;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(virtualUrl));
if(/^import /m.test(code))throw Error('unsupported source imports');
const results=[];
for(const [name,suffix] of [['baseline','schema=public'],['query-host','schema=public&host=synthetic.invalid'],['query-port','schema=public&port=6543']]) {
 const url='postgresql://synthetic:synthetic@localhost:5433/synthetic?'+suffix;
 const rootEnv='POSTGRES_USER=synthetic\nPOSTGRES_PASSWORD=synthetic\nPOSTGRES_DB=synthetic\nPOSTGRES_PORT=5433\nREDIS_PORT=6379\n';
 const appEnv='DATABASE_URL='+url+'\nREDIS_HOST=localhost\nREDIS_PORT=6379\n';
 const files=new Map([[resolve(virtualRoot,'package.json'),JSON.stringify(manifest)],[resolve(virtualRoot,'.env'),rootEnv],...['apps/api','apps/worker','apps/web'].map(folder=>[resolve(virtualRoot,folder,'.env'),appEnv])]);
 const calls=[];const logs=[];
 const proc={platform:'linux',execPath:process.execPath,versions:process.versions,env:{},exitCode:0};
 runInNewContext(code,{URL,resolve,dirname,fileURLToPath,randomBytes,parseEnv,process:proc,console:{log:x=>logs.push(String(x)),error:x=>logs.push(String(x))},existsSync:path=>files.has(path),readFileSync:path=>{if(!files.has(path))throw Error('Unexpected virtual read');return files.get(path);},writeFileSync:()=>{throw Error('Filesystem mutation forbidden');},spawnSync:(command,args)=>{calls.push([command,...args]);return {status:0,stdout:command==='corepack'&&args.at(-1)==='--version'?manifest.engines.pnpm:command==='docker'&&args[0]==='info'?'synthetic-daemon':''};}},{timeout:2000});
 const parsed=new Client({connectionString:url}).connectionParameters;
 results.push({name,guardPassed:proc.exitCode===0,deployCommandReached:calls.some(c=>c.includes('api:db:deploy')),seedCommandReached:calls.some(c=>c.includes('api:db:seed')),effectiveDriverHost:parsed.host,effectiveDriverPort:parsed.port,realChildProcesses:0,realConnections:0,realFileWrites:0});
}
if(!results[0].guardPassed||!results[1].seedCommandReached||results[1].effectiveDriverHost!=='synthetic.invalid'||!results[2].seedCommandReached||Number(results[2].effectiveDriverPort)!==6543)throw Error('Expected probe behavior changed');
const report={checkedAt:new Date().toISOString(),scope:'unmodified bootstrap control flow in VM with virtual filesystem and stubbed child processes; pg Client constructor only, never connect',results,limitations:'Prisma migrate engine URL interpretation not tested; no real migration, seed, remote access or current-primary compromise demonstrated'};
writeFileSync('node_modules/.cache/d7-bootstrap-isolated-probe.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
