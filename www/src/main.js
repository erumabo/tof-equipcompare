import Alpine from "../libs/alpine.esm.js";
window.Alpine = Alpine;
Alpine.store('equipo', {
    equipo: [],
    headers: []
  });
  
window.onload = () => {Alpine.start()};

import Tesseract from "../libs/tesseract.esm.min.js";
let tworker;

import StatList from "./statList.js";
let headers = ["Pieza", ...StatList];
Alpine.store("equipo").headers = headers;


function imageModal(ev) {
      let i = ev.target.dataset.index;
      Alpine.store("equipo").p = i;
      document.getElementById("imageDialog").showModal();
    }
window.imageModal = imageModal;

function processStat(stat) {
  let type, value;
  
  if(stat.includes('%')) type = '%';
  else type = '+';
  
  [, value] = stat.replace(" ","").split('+');
  stat = stat.split('+')[0].replace('ala','a la').trim();
  try {
    value = parseFloat(value.replaceAll('.','').replace(',', '.').replace('%',''));
  }
  catch(err) {
    console.error(stat, value, err);
  }
  
  return {attr:headers.findIndex(h=>h==stat), stat, type, value}
}

function processTextData(text) {
  let aleatorias = text.split('aleatorias')[1]?.split("\n") || [];
  if (aleatorias.length == 0) return false;
  aleatorias = aleatorias.map(stat => {
    if(/^([ACDR]|PS)/.test(stat)) return stat;
    let [, ...st] = stat.split(" ");
    return st.join(" ");
  }).filter(e => e && e != "");
  aleatorias.splice(4);
  return aleatorias
    .map(processStat)
    .reduce((row,s) => {
      if(s.attr>0) row[s.attr] = s.value + (s.type!='+'?'%':0);
      return row;
    }, new Array(headers.length).fill(0));
}

function fileToImage(file) {
  const fr = new FileReader();
  const promise = new Promise(resolve => {
    fr.onload = () => {
      const img = new Image();
      img.name = file.name;
      img.src = fr.result;
      resolve(img);
    }
  })
  fr.readAsDataURL(file);
  return promise;
}


const fileInput = document.getElementById("inputOpen");
fileInput.onchange = processImages;

const pasteInput = document.getElementById("inputOpen2");
pasteInput.onpaste = ev => {
  ev.preventDefault();
  fileInput.files = (ev.clipboardData || window.clipboardData).files;
  processImages();
}

const table = document.getElementById("table").getElementsByTagName('tbody')[0];
async function processImages() {
  const tworker = await Tesseract.createWorker('spa');
  const files = fileInput.files;
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  canvas.height = 200;
  let img;
  for (const file of files) {
    if(file.type.indexOf('image') < 0) continue;
    //console.log("procesing image", file.name);

    img = await fileToImage(file);
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // draw the image
    //console.log("recognizing image", file.name)

    let { data: { text } } = (await tworker.recognize(canvas));
    let stats = processTextData(text);
    
    canvas.width = (canvas.height = 250) * img.width / img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if(stats) {
      stats[0] = canvas.toDataURL("image/jpeg");
      Alpine.store('equipo').equipo.push(stats);
    }
    //console.log("processed inage", file.name)

    table.lastElementChild?.scrollIntoView(true);
  }
  await tworker.terminate();
}


document.getElementById("btnExport").onclick = () => {
  let csv = Alpine.store("equipo").headers.join(",") + "\n";
  csv += Alpine.store("equipo").equipo.map(e => {
    return e.map(a=>'"'+a+'"').join(",")
  }).join("\n");
  
  const a = document.createElement("a");
  a.setAttribute("href",  'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
  a.setAttribute("download", "Equipo_"+(Date.now())+".csv");
  a.click();
}