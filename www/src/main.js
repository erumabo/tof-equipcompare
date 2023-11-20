import Alpine from "../libs/alpine.esm.js";
//window.Alpine = Alpine;

import Tesseract from "../libs/tesseract.esm.min.js";
let tworker;

Alpine.store('equipo', {
    equipo: []
  })


function processStat(stat) {
  console.log(stat);
  let attr, type, value;
  attr = stat.replaceAll(" ",'');
  
  if(stat.includes('%')) type = '%';
  else type = '+';
  
  [, value] = attr.split('+');
  [stat] = stat.split('+');
  value = parseFloat(value.replaceAll('.','').replace(',', '.').replace('%',''));
  
  return {attr: stat.replace('ala','a la').trim(), type, value}
}

function processTextData(text) {
  let aleatorias = text.split('aleatorias')[1]?.split("\n") || [];
  if (aleatorias.length == 0) return false;
  aleatorias = aleatorias.map(stat => {
    if(/^([ACDR]|PS)/i.test(stat)) return stat;
    let [, ...st] = stat.split(" ");
    return st.join(" ");
  }).filter(e => e && e != "");
  aleatorias.splice(4);
  aleatorias = aleatorias.map(processStat);
  
  Alpine.store('equipo').equipo.push({
    pieza: aleatorias.map(s=>s.attr).join(", ")
  });
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

async function processImages(ev) {
  const tworker = await Tesseract.createWorker('spa');
  const files = fileInput.files;
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  let img;
  for (const file of files) {
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