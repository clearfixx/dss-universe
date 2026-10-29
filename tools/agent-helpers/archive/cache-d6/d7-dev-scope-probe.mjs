import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createConnection} from 'node:net';
const root='F:/Code/dss-universe';
let phase='environment';
const load=(folder,layers)=>Object.assign({},...layers.filter(x=>existsSync(`${root}/${folder}${x}`)).map(x=>parseEnv(readFileSync(`${root}/${folder}${x}`,'utf8'))));
const check=(value,label)=>{if(!value)throw Error(label);};
try {
 const infra=load('', ['.env']);
 const api=load('apps/api/', ['.env','.env.local']);
 const worker=load('apps/worker/', ['.env']);
 const web=load('apps/web/', ['.env','.env.development','.env.local','.env.development.local']);
 const listener=load('apps/web/', ['.env.dev-port']);
 const site=`http://localhost:${listener.PORT??3000}`;
 const apiBase=`http://localhost:${api.PORT??3001}/api`;
 const {Client}=createRequire(root+'/package.json')('pg');
 const aligned=(env)=>{
  const c=new Client({connectionString:env.DATABASE_URL});const p=c.connectionParameters;
  return ['localhost','127.0.0.1'].includes(p.host)&&Number(p.port)===Number(infra.POSTGRES_PORT)&&p.user===infra.POSTGRES_USER&&p.password===infra.POSTGRES_PASSWORD&&p.database===infra.POSTGRES_DB&&['localhost','127.0.0.1'].includes(env.REDIS_HOST??'localhost')&&String(env.REDIS_PORT)===infra.REDIS_PORT;
 };
 const checks={
  apiInfrastructureAligned:aligned(api),workerInfrastructureAligned:aligned(worker),
  accessSecretPresent:Boolean(api.JWT_ACCESS_SECRET),refreshSecretPresent:Boolean(api.JWT_REFRESH_SECRET),
  twoFactorKeyPresent:Boolean(api.AUTH_2FA_ENCRYPTION_KEY),
  devSigningPolicy:api.MEDIA_SIGNING_SECRET?api.MEDIA_SIGNING_SECRET.length>=32:api.NODE_ENV!=='production',
  publicEndpointsAligned:web.NEXT_PUBLIC_SITE_URL===site&&web.NEXT_PUBLIC_API_URL===apiBase&&web.NEXT_PUBLIC_GRAPHQL_URL===apiBase+'/graphql',
  apiOriginIncludesSite:(api.WEB_ORIGINS??'').split(',').map(x=>x.trim()).includes(site),
  mailPortsAligned:api.MAIL_PORT===(infra.DSS_MAILPIT_SMTP_PORT??'2525')&&worker.MAIL_PORT===(infra.DSS_MAILPIT_SMTP_PORT??'2525'),
  emailLinksAligned:[api,worker].every(e=>e.PASSWORD_RESET_WEB_URL===site+'/reset-password'&&e.EMAIL_VERIFICATION_WEB_URL===site+'/verify-email'),
 };
 for(const [key,value] of Object.entries(checks))check(value,key);
 phase='http-readiness';
 const get=async(url,options={})=>{const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});check(r.ok,'HTTP probe');return r;};
 const health=await(await get(apiBase+'/health/ready')).json();
 check(health.status==='ok'&&health.database.status==='up'&&health.redis.status==='up'&&health.worker.status==='up','API dependencies');
 const webResponse=await get(site);
 const cors=await get(apiBase+'/graphql',{method:'OPTIONS',headers:{Origin:site,'Access-Control-Request-Method':'POST'}});
 check(cors.headers.get('access-control-allow-origin')===site&&cors.headers.get('access-control-allow-credentials')==='true','CORS');
 const graph=await(await get(apiBase+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{ __typename }'})})).json();
 check(graph.data?.__typename==='Query'&&!graph.errors,'GraphQL');
 const pgadmin=await get(`http://127.0.0.1:${infra.PGADMIN_PORT}`);
 const mail=await get('http://127.0.0.1:18025/readyz');
 phase='compose-inspection';
 const docker=(args)=>execFileSync('docker',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
 const compose=JSON.parse(docker(['compose','--env-file',root+'/.env','config','--format','json']));
 const testCompose=JSON.parse(docker(['compose','-f','docker-compose.test.yml','config','--format','json']));
 const specs=[['postgres','dss_postgres'],['redis','dss_redis'],['pgadmin','dss_pgadmin'],['mailpit','dss-universe-mailpit-1'],['clamav','dss-universe-clamav-1'],['postgres-test','dss-universe-postgres-test-1'],['redis-test','dss-universe-redis-test-1']];
 const containers=[];
 for(const [service,name] of specs){
  const actual=JSON.parse(docker(['inspect',name]))[0];const expected=compose.services[service]??testCompose.services[service];
  check(actual.State.Running,service+' not running');
  if(expected.healthcheck)check(actual.State.Health?.Status==='healthy',service+' unhealthy');
  check(actual.Config.Image===expected.image,service+' image mismatch');
  check(expected.ports.every(p=>p.host_ip==='127.0.0.1'),service+' declared nonloopback');
  for(const p of expected.ports){const binding=actual.NetworkSettings.Ports[`${p.target}/tcp`];check(binding?.length===1&&binding[0].HostIp==='127.0.0.1'&&binding[0].HostPort===String(p.published),service+' effective port mismatch');}
  containers.push({service,running:true,health:actual.State.Health?.Status??'not-configured',imageMatches:true,loopbackMappingsMatch:true});
 }
 const pinned=compose.services.pgadmin.image;
 check(/^dpage\/pgadmin4@sha256:[0-9a-f]{64}$/.test(pinned),'pgAdmin not digest-pinned');
 const pinnedId=docker(['image','inspect',pinned,'--format','{{.Id}}']).trim();
 check(JSON.parse(docker(['inspect','dss_pgadmin']))[0].Image===pinnedId,'pgAdmin content mismatch');
 phase='clamav-host-ping';
 await new Promise((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port:3310});socket.setTimeout(5000);let bytes='';socket.on('connect',()=>socket.write('zPING\0'));socket.on('data',chunk=>{bytes+=chunk.toString();if(bytes.includes('PONG')){socket.destroy();resolve();}else if(bytes.length>32){socket.destroy();reject(Error('Unexpected ClamAV response'));}});socket.on('timeout',()=>{socket.destroy();reject(Error('ClamAV timeout'));});socket.on('error',reject);});
 const result={checkedAt:new Date().toISOString(),scope:'local dev only; not production, arbitrary overrides, all auth flows or a new D7 full gate',checks,mediaSigning:api.MEDIA_SIGNING_SECRET?'configured':'documented development fallback',http:{web:webResponse.status,api:'ok',worker:'up',graphql:'Query',cors:cors.status,pgadmin:pgadmin.status,mailpit:mail.status},containers,pgadminDigestMatches:true,clamavHostPing:'PONG',mutations:'none; HTTP/GraphQL typename, metadata and daemon PING only'};
 writeFileSync('node_modules/.cache/d7-dev-scope-probe.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}catch(error){console.error(JSON.stringify({probe:'dev-scope',phase,code:error.code??'CHECK_FAILED'}));process.exitCode=1;}
