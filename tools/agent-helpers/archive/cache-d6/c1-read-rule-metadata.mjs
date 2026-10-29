import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const base='F:/Code/dss-universe';
const root=parseEnv(readFileSync(base+'/.env','utf8'));
const local=base+'/apps/api/.env.local';
const env={...parseEnv(readFileSync(base+'/apps/api/.env','utf8')),...(existsSync(local)?parseEnv(readFileSync(local,'utf8')):{})};
const {Client}=createRequire(base+'/package.json')('pg');
const client=new Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:5000});
const p=client.connectionParameters;
if(!['localhost','127.0.0.1'].includes(p.host)||Number(p.port)!==5433||p.user!==root.POSTGRES_USER||p.password!==root.POSTGRES_PASSWORD||p.database!==root.POSTGRES_DB)throw Error('Primary dev coordinate guard failed');
let phase='connect';
try {
 await client.connect();
 await client.query('BEGIN READ ONLY');
 await client.query("SET LOCAL statement_timeout='5s'");
 phase='point-rule-metadata';
 const points=await client.query('SELECT "eventName","payloadValue",enabled FROM public.community_point_rules ORDER BY "eventName","payloadValue" NULLS FIRST');
 phase='achievement-rule-metadata';
 const achievements=await client.query('SELECT "eventName","recipientPayloadKey",repeatable,"cooldownHours","dailyCap",enabled FROM public.achievement_rules ORDER BY "eventName","recipientPayloadKey"');
 await client.query('ROLLBACK');
 const metadata={points:points.rows,achievements:achievements.rows};
 const result={readOnly:true,port:5433,pointRules:points.rowCount,achievementRules:achievements.rowCount,metadataSha256:createHash('sha256').update(JSON.stringify(metadata)).digest('hex'),metadata};
 writeFileSync('node_modules/.cache/c1-local-rule-metadata.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({readOnly:result.readOnly,pointRules:result.pointRules,achievementRules:result.achievementRules,metadataSha256:result.metadataSha256}));
} catch(error) { console.error(JSON.stringify({probe:'read-only-rule-metadata',phase,code:error.code??'unknown'})); process.exitCode=1; }
finally { await client.end(); }
