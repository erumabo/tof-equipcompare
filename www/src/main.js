import Alpine from "../libs/alpine.esm.js";
//window.Alpine = Alpine;

import Tesseract from "../libs/tesseract.esm.min.js";
let tworker;

Alpine.store('equipo', {
    equipo: []
  })


function processStat(stat) {
  let attr, type, value;
  stat = stat.toUpperCase().replaceAll(" ",'');
  if(stat.includes('%')) {
    type = '%'
  } else {
    type = '+'
  }
  
  [attr, value] = stat.split(type);
  value = parseFloat(value.replaceAll('.','').replace(',', '.'));
  console.log(attr, type, value);
  
  if(attr.includes("PS")) {
    attr = "PS"
  } else if(stat.includes("ATAQUE")) {
    
  }
  
  return {attr, type, value}
}

function processTextData(text) {
  let aleatorias = text.split('aleatorias')[1]?.split("\n") || [];
  if (aleatorias.length == 0) return false;
  aleatorias = aleatorias.map(stat => {
    let [_, ...st] = stat.split(" ");
    return st.join(" ");
  }).filter(e => e && e != "");
  aleatorias.splice(4);
  aleatorias = aleatorias.map(processStat);
  
  Alpine.store('equipo').equipo.push({
    pieza: aleatorias.join("\n")
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


const fileInput = document.getElementById("inputOpen")
fileInput.onchange = processImages;

async function processImages(ev) {
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
}

  

window.onload = () => {
  Alpine.start();
  Tesseract.createWorker('spa')
    .then((tw) => {
      tworker = tw;
      fileInput.disabled = false;
      console.log("Ready");
    });
};
window.onbeforeunload = async () => { if (tworker) await tworker.terminate() }