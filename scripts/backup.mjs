import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
const source=resolve(process.env.HOMECARE_DB_PATH??'data/homecare.sqlite');
if(!existsSync(source)){console.error('No database found. Open the dashboard once first.');process.exitCode=1;}
else {
  const folder=join(dirname(source),'backups');mkdirSync(folder,{recursive:true});
  const target=join(folder,`homecare-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
  const db=new DatabaseSync(source,{readOnly:true});
  try {await backup(db,target);console.log(`Backup saved locally: ${target}`);}finally{db.close();}
}
