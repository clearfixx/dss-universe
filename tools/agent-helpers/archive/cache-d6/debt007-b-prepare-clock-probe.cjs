/** DSS File Passport — ignored SQL-shape diagnostic, owned disposable fixture only. */
const {createRequire}=require('node:module'); const {resolve}=require('node:path');
const root=resolve(__dirname,'../..'); const api=createRequire(resolve(root,'apps/api/package.json'));
api('ts-node').register({project:resolve(root,'apps/api/tsconfig.json'),transpileOnly:true});
api('tsconfig-paths').register({baseUrl:root,paths:{'@api/*':['apps/api/src/*']}});api('reflect-metadata');
const source=(p)=>api(resolve(root,'apps/api',p));
const {createIsolatedApiSchemaFixture}=source('test/helpers/migrated-api-schema.fixture');
const {AuditWriterService,AuditRedactionService}=source('src/core/audit');
const {PrismaRoutingControlRepository}=source('src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository');
(async()=>{const f=await createIsolatedApiSchemaFixture({captureQueries:true});try{
await new PrismaRoutingControlRepository(f.prisma,new AuditWriterService(new AuditRedactionService())).prepare({actorId:'synthetic:clock',actorType:'SERVICE'});
console.log(JSON.stringify({inserts:f.queries.filter(q=>q.includes('INSERT INTO')&&/gamification_(activations|discovery)/.test(q))}));
}finally{await f.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
