import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const environment=process.argv[2]??'dev';
if(!['dev','qa','uat'].includes(environment))throw new Error('Use dev, qa or uat');
const webPort={dev:8080,qa:8081,uat:8082}[environment];
const mailPort={dev:8025,qa:8026,uat:8027}[environment];
const path=environment==='dev'?'.env':`.env.${environment}`;
writeFileSync(path,[`COMPOSE_PROJECT_NAME=northstar-${environment}`,`WEB_PORT=${webPort}`,`MAILPIT_PORT=${mailPort}`,`POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`,`SESSION_SECRET=${randomBytes(32).toString('hex')}`,`PUBLIC_ORIGIN=http://localhost:${webPort}`,'COOKIE_SECURE=false',''].join('\n'),{flag:'wx'});
console.log(`Created ${path}; existing configuration is never overwritten. Secrets were not printed.`);
