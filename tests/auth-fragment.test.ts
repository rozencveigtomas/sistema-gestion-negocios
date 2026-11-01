import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEmailFragment} from '../src/lib/auth-fragment';
const tokens='access_token=example.jwt.token.with.enough.characters&refresh_token=example_refresh_token';
test('default invitation and recovery fragments parse without retaining unrelated fields',()=>{
  for(const type of ['invite','recovery']){
    const session=parseEmailFragment(`#${tokens}&type=${type}&next=https://evil.example`);
    assert.equal(session?.type,type);
    assert.deepEqual(Object.keys(session!).sort(),['access_token','refresh_token','type']);
  }
});
test('missing, duplicated, expired and unsupported email fragments fail closed',()=>{
  for(const fragment of ['',tokens,`${tokens}&type=signup`,`${tokens}&type=invite&type=recovery`,`${tokens}&type=invite&error_code=otp_expired`,`${tokens}&type=invite&access_token=duplicate`,'#'+'x'.repeat(12001)])assert.equal(parseEmailFragment(fragment),null);
});
test('malformed token characters cannot enter the email session action',()=>{
  assert.equal(parseEmailFragment(`#${tokens}&type=invite`.replace('example_refresh_token','%0Ainvalid_token')),null);
});
