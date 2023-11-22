import Alpine from "../libs/alpine.esm.js";
//window.Alpine = Alpine;
Alpine.store('equipo', {
    equipo: [],
    headers: []
  });

import Tesseract from "../libs/tesseract.esm.min.js";
let tworker;

import StatList from "./statList.js";
let headers = ["Pieza", ...StatList];
Alpine.store("equipo").headers = headers;


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
  aleatorias = aleatorias
    .map(processStat)
    .reduce((row,s) => {
      if(s.attr>0) row[s.attr] = s.value + s.type;
      return row;
    }, new Array(headers.length).fill(0));
  aleatorias[0] = ""
  
  Alpine.store('equipo').equipo.push(aleatorias);
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

async function processImages() {
  const tworker = await Tesseract.createWorker('spa');
  const files = fileInput.files;
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  let img;
  for (const file of files) {
    if(file.type.indexOf('image') < 0) continue;
    console.log("procesing image", file.name);

    img = await fileToImage(file);
    canvas.width = img.width; // set canvas size big enough for the image
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0); // draw the image

    let { data: { text } } = (await tworker.recognize(canvas));
    processTextData(text);
  }
  await tworker.terminate();
}

  

window.onload = () => {
  Alpine.start();
};