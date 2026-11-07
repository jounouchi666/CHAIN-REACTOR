// Refuse to drive an unrelated service which happens to occupy the local port.
export default async function(){
  const response=await fetch('http://127.0.0.1:4191/__chain_reactor_health_v1',{signal:AbortSignal.timeout(3000)});
  const identity=await response.json();if(!response.ok||identity.app!=='chain-reactor'||identity.protocol!==1)throw new Error('Port 4191 is not a recognized CHAIN REACTOR server. No UI operations were sent.');
}
