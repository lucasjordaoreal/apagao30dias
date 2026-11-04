// Keep stable controls and scroll positions while updating live values.
export function updateMarkup(root,html){
  const template=document.createElement('template');template.innerHTML=html;
  function patch(parent,next){
    const old=[...parent.childNodes],fresh=[...next.childNodes];
    for(let i=0;i<Math.max(old.length,fresh.length);i++){
      const a=old[i],b=fresh[i];if(!b){a.remove();continue;}if(!a){parent.append(b.cloneNode(true));continue;}
      if(a.nodeType!==b.nodeType||a.nodeName!==b.nodeName||(a.nodeType===1&&a.dataset.act!==b.dataset.act)){a.replaceWith(b.cloneNode(true));continue;}
      if(a.nodeType===3){if(a.data!==b.data)a.data=b.data;continue;}
      if(a.nodeType!==1)continue;
      for(const attr of [...a.attributes])if(!b.hasAttribute(attr.name))a.removeAttribute(attr.name);
      for(const attr of b.attributes)if(a.getAttribute(attr.name)!==attr.value)a.setAttribute(attr.name,attr.value);
      patch(a,b);
    }
  }
  patch(root,template.content);
}
