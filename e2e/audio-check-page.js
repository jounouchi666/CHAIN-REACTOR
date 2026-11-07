import {checkCues} from './audio-check.js';
try{document.querySelector('#result').textContent=JSON.stringify({status:'PASS',cues:await checkCues()},null,2);}catch(error){document.querySelector('#result').textContent=JSON.stringify({status:'FAIL',error:error.message});}
