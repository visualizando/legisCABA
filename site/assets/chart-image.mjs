// Resolve CSS on a detached SVG copy, then rasterize without external assets.
export async function chartPng(svg,{title,subtitle,footer,background='#f8f7f3'}){
  const clone=svg.cloneNode(true),originals=[svg,...svg.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const properties=['fill','stroke','stroke-width','stroke-dasharray','stroke-opacity','fill-opacity','font-family','font-size','font-weight','paint-order','text-anchor','dominant-baseline','display','visibility'];
  originals.forEach((node,i)=>{const style=getComputedStyle(node);for(const property of properties)copies[i].style.setProperty(property,style.getPropertyValue(property));});
  clone.querySelectorAll('[data-export-ignore]').forEach(node=>node.remove());
  clone.querySelectorAll('.vote-line-group,.vote-endpoint').forEach(node=>node.style.opacity='1');
  const ns='http://www.w3.org/2000/svg',width=svg.viewBox.baseVal.width,height=svg.viewBox.baseVal.height;
  const output=document.createElementNS(ns,'svg');output.setAttribute('xmlns',ns);output.setAttribute('width',width);output.setAttribute('height',height+150);
  const rect=document.createElementNS(ns,'rect');rect.setAttribute('width','100%');rect.setAttribute('height','100%');rect.setAttribute('fill',background);output.append(rect);
  function text(value,x,y,size,weight='400'){
    const label=document.createElementNS(ns,'text');label.setAttribute('x',x);label.setAttribute('y',y);label.setAttribute('font-family','Arial, sans-serif');label.setAttribute('font-size',size);label.setAttribute('font-weight',weight);label.setAttribute('fill','#263c35');label.textContent=value;output.append(label);
  }
  text(title,20,32,22,'700');
  // Wrap context so long selections never run outside the exported image.
  const words=subtitle.split(' ');let line='',row=0;const limit=Math.floor((width-40)/7);
  for(const word of words){if((line+' '+word).length>limit){text(line,20,57+row*17,12);line='';row++;}line+=(line?' ':'')+word;}
  if(line)text(line,20,57+row*17,12);
  clone.setAttribute('width',width);clone.setAttribute('height',height);
  clone.setAttribute('y',85+Math.max(0,row-1)*17);output.append(clone);
  const totalHeight=height+150+Math.max(0,row-1)*17;output.setAttribute('height',totalHeight);
  text(footer,20,totalHeight-24,11);
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(output)],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=totalHeight*2;
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo generar el PNG')),'image/png'));
  }finally{URL.revokeObjectURL(url);}
}
