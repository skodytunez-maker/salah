import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const target=process.argv[2];if(!target)throw Error('Output JAR path required');
const response=await fetch('https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar',{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Could not fetch pinned bundletool');
const bytes=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!=='a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29')throw Error('Bundletool integrity mismatch');await fs.writeFile(target,bytes);console.log('Verified official bundletool 1.18.3');
