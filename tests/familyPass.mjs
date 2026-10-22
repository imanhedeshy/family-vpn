import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyFamilyPass } from '../src/main/familyPass.ts';
const key = generateKeyPairSync('ed25519');
const publicKey = key.publicKey.export({format:'der',type:'spki'}).subarray(-32);
const now = Date.parse('2030-01-01T00:00:00Z');
const fixture = {version:2,accountID:'00000000-0000-4000-8000-000000000001',displayName:'Synthetic Person',expiresAt:'2030-01-02T00:00:00Z',platformConfigurations:Object.fromEntries(['macos','ios','android','windows'].map(x=>[x,JSON.stringify({testPlatform:x})]))};
function envelope(document, context='AdaTech Family VPN configuration v1\n') {
 const payload=Buffer.from(JSON.stringify(document));
 return Buffer.from(JSON.stringify({version:1,payload:payload.toString('base64'),signature:sign(null,Buffer.concat([Buffer.from(context),payload]),key.privateKey).toString('base64')}));
}
let checks=0;
const valid=envelope(fixture);
const result=verifyFamilyPass(valid,publicKey,now);
assert.deepEqual(JSON.parse(result.configuration),{testPlatform:'windows'});checks++;
assert.equal(result.accountID,fixture.accountID);checks++;
function rejects(data,pk=publicKey,time=now){assert.throws(()=>verifyFamilyPass(data,pk,time),{message:'The personal VPN pass file is invalid or expired.'});checks++;}
rejects(valid,Buffer.alloc(32));rejects(valid,Buffer.alloc(31));rejects(valid,publicKey,Date.parse(fixture.expiresAt));
for(const mutation of [x=>x.version=1,x=>x.displayName='\n',x=>x.accountID='bad',x=>x.expiresAt='bad',x=>x.expiresAt='2030-02-30T00:00:00Z',x=>x.configuration='{}',x=>delete x.platformConfigurations.android,x=>x.platformConfigurations.ios='[]',x=>x.platformConfigurations.android='{broken}']){const x=structuredClone(fixture);mutation(x);rejects(envelope(x));}
rejects(Buffer.alloc(1_500_001));rejects(Buffer.from('{}'));rejects(envelope(fixture,'different context\n'));
const tampered=JSON.parse(valid);tampered.payload=Buffer.from(JSON.stringify({...fixture,displayName:'Changed'})).toString('base64');rejects(Buffer.from(JSON.stringify(tampered)));
for(const mutation of [x=>x.version=2,x=>x.signature=Buffer.alloc(63).toString('base64'),x=>x.payload='!'+x.payload,x=>x.signature='x']){const x=JSON.parse(valid);mutation(x);rejects(Buffer.from(JSON.stringify(x)));}
console.log(`PASS: ${checks} synthetic Windows pass validation checks; no profile or service writes`);
