const fpsInput=document.getElementById("fps");
const durationInput=document.getElementById("duration");
const output=document.getElementById("output");
const copyBtn=document.getElementById("copyScript");

function generateScript(fps,duration){
return `(async () => {
const FPS=${fps};
const DURATION=${duration};

const canvas=document.querySelector('canvas[data-test-id="shuffle-renderer-canvas"]');

if(!canvas){
console.error("Canvas not found");
return;
}

let titleEl=document.querySelector('[data-test-id="pin-title-wrapper"] h1');
let fileName="untitled";

if(titleEl&&titleEl.textContent.trim()){
fileName=titleEl.textContent.trim();
}

fileName=fileName
.replace(/[\\/:*?"<>|]/g,"")
.replace(/\\s+/g,"_")
.slice(0,100);

const stream=canvas.captureStream(FPS);

const recorder=new MediaRecorder(stream,{
mimeType:"video/webm"
});

const chunks=[];

recorder.ondataavailable=e=>{
if(e.data.size>0)chunks.push(e.data);
};

recorder.onstop=()=>{
const blob=new Blob(chunks,{type:"video/webm"});
const url=URL.createObjectURL(blob);

const a=document.createElement("a");
a.href=url;
a.download=fileName+".webm";
a.click();

URL.revokeObjectURL(url);
};

recorder.start();

setTimeout(()=>{
recorder.stop();
},DURATION*1000);
})();`;
}

function updateOutput(){
output.value=generateScript(fpsInput.value,durationInput.value);
}

fpsInput.addEventListener("change",updateOutput);
durationInput.addEventListener("input",updateOutput);

copyBtn.addEventListener("click",async()=>{
await navigator.clipboard.writeText(output.value);
copyBtn.textContent="Copied!";

setTimeout(()=>{
copyBtn.textContent="Copy Recorder Script";
},1500);
});

updateOutput();