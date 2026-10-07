import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import{fileURLToPath}from 'node:url';
import{spawnSync}from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=(await fs.readdir(path.join(root,'scripts'))).filter(name=>/^check-.*\.mjs$/.test(name)&&name!=='check-app.mjs').sort();
const results=[];
for(const name of checks){
 let result,attempts=0;const began=Date.now();
 do{result=spawnSync(process.execPath,[path.join(root,'scripts',name)],{cwd:root,encoding:'utf8',windowsHide:true,timeout:45000});attempts++;}
 while(process.platform==='win32'&&result.status===3221225477&&!result.stdout&&!result.stderr&&attempts<3);
 results.push({check:name,passed:result.status===0,durationMs:Date.now()-began,attempts,status:result.status,error:result.error?.message||null,output:(result.stdout+result.stderr).slice(-5000)});
 if(result.status!==0)console.error('FAIL: '+name+'\n'+(result.stderr||result.error?.message||'Runtime terminated without diagnostics'));
}
const report={schemaVersion:1,sourceCommit:process.env.GITHUB_SHA||null,node:process.version,platform:process.platform,checkedAt:new Date().toISOString(),passed:results.filter(r=>r.passed).length,total:results.length,results};
const destination=path.resolve(process.argv[2]||path.join(os.tmpdir(),'salah-app-qa.json'));
await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(report,null,2)+'\n');
console.log((report.passed===report.total?'PASS':'FAIL')+': '+report.passed+'/'+report.total+' application checks. Report: '+destination);
if(report.passed!==report.total)process.exitCode=1;
