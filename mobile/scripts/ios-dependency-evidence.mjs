import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
const resolvedPath='ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved';
export function verifyIosPins(resolved,expected){
 const pins=resolved.pins;
 if(![2,3].includes(resolved.version)||!Array.isArray(pins)||pins.length!==1)throw new Error('Unexpected Swift packages; review the dependency graph before replacing any pins.');
 const pin=pins[0];
 if(pin.identity!==expected.identity||pin.location!==expected.url||pin.state?.version!==expected.version||pin.state?.revision!==expected.revision)throw new Error('Swift package version or revision differs from the reviewed source.');
 return pin;
}

export async function pinIosPackages(mobileRoot){
 const root=path.resolve(mobileRoot);
 const config=JSON.parse(await fs.readFile(path.join(root,'licenses/native-sources.json'),'utf8'));
 const pkg=JSON.parse(await fs.readFile(path.join(root,'node_modules/@capacitor/ios/package.json'),'utf8'));
 if(pkg.version!==config.capacitorVersion)throw new Error('Review native sources before changing Capacitor.');
 const manifestPath=path.join(root,'ios/App/CapApp-SPM/Package.swift');
 const original=await fs.readFile(manifestPath,'utf8');
 const expression=/\.package\(url:\s*"https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git",\s*(?:from|exact):\s*"([^"]+)"\)/g;
 const matches=[...original.matchAll(expression)];
 if(matches.length!==1||matches[0][1]!==config.swift.version)throw new Error('Unknown generated Swift manifest; no files changed.');
 const target=path.join(root,resolvedPath);
 let existing;
 try{existing=JSON.parse(await fs.readFile(target,'utf8'));verifyIosPins(existing,config.swift)}catch(error){if(error.code!=='ENOENT')throw error}
 const changed=original.replace(expression,'.package(url: "'+config.swift.url+'", exact: "'+config.swift.version+'")');
 const resolved={version:2,pins:[{identity:config.swift.identity,kind:'remoteSourceControl',location:config.swift.url,state:{revision:config.swift.revision,version:config.swift.version}}]};
 await fs.writeFile(manifestPath,changed);
 if(!existing){await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(resolved,null,2)+'\n')}
 return resolved;
}

export async function collectIosEvidence(mobileRoot,derivedData){
 const root=path.resolve(mobileRoot),build=path.resolve(derivedData);
 const config=JSON.parse(await fs.readFile(path.join(root,'licenses/native-sources.json'),'utf8'));
 const resolved=JSON.parse(await fs.readFile(path.join(root,resolvedPath),'utf8'));verifyIosPins(resolved,config.swift);
 const checkout=path.join(build,'SourcePackages/checkouts',config.swift.identity);
 const revision=execFileSync('git',['-C',checkout,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(revision!==config.swift.revision)throw new Error('The compiled Swift checkout differs from its reviewed revision.');
 const manifest=await fs.readFile(path.join(checkout,'Package.swift'));
 if(checksum(manifest)!==config.swift.manifestSha256)throw new Error('The Swift binary manifest changed.');
 const app=path.join(build,'Build/Products/Debug-iphonesimulator/App.app');
 const binaries=[];
 for(const [name,archiveSha256] of Object.entries(config.swift.binaries)){
  const binary=await fs.readFile(path.join(app,'Frameworks',name+'.framework',name));
  binaries.push({name,declaredArchiveSha256:archiveSha256,compiledSimulatorBinarySha256:checksum(binary)});
 }
 const notices=[];
 for(const name of ['Apache-2.0.txt','Cordova-NOTICE.txt']){
  const source=await fs.readFile(path.join(root,'licenses',name));
  const packaged=await fs.readFile(path.join(app,'public/third-party/native',name));
  if(!source.equals(packaged))throw new Error('A native notice is missing or changed in the compiled app: '+name);
  notices.push({file:name,sha256:checksum(source)});
 }
 const report={schemaVersion:1,scope:'Actual iOS simulator Swift checkout, embedded framework fingerprints and preserved license notices. Archive checksums are declared by SwiftPM; compiled binary hashes are separate. Excludes SDKs, gems, content and device signing.',package:config.swift,resolved,binaries,notices};
 const reports=path.join(root,'reports');await fs.mkdir(reports,{recursive:true});await fs.writeFile(path.join(reports,'ios-native.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: pinned iOS package revision, binary manifest and license notices inside the compiled app.');
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 if(process.argv[2]==='--pin'){await pinIosPackages(root);console.log('SALAH iOS package pinned to its reviewed version and revision.')}
 else if(process.argv[2]==='--collect'&&process.argv[3])await collectIosEvidence(root,process.argv[3]);
 else throw new Error('Use --pin or --collect <derived-data-path>.');
}
