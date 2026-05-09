const button=document.getElementById("downloadBtn");
const urlInput=document.getElementById("url");
const formatInput=document.getElementById("format");
const status=document.getElementById("status");

button.addEventListener("click",async()=>{

const pinterestUrl=urlInput.value.trim();
const format=formatInput.value;

if(!pinterestUrl){
alert("Paste a Pinterest URL");
return;
}

status.textContent="Processing...";

try{

const response=await fetch("http://localhost:3000/capture",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({url:pinterestUrl,format})
});

if(!response.ok){
throw new Error("Failed");
}

const blob=await response.blob();

const downloadUrl=URL.createObjectURL(blob);

const a=document.createElement("a");
a.href=downloadUrl;
a.download=`collage.${format}`;
a.click();

URL.revokeObjectURL(downloadUrl);

status.textContent="Done";

}catch(err){
console.error(err);
status.textContent="Error";
}

});