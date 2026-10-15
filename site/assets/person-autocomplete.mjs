import {normalize} from './model.mjs';

export function personAutocomplete(input,list,people,onSelect){
  let results=[],active=-1;
  const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
  const choose=person=>{input.value=person.name;close();onSelect(person.id);};
  function show(){
    const query=normalize(input.value).trim();
    results=people.filter(p=>normalize(p.name).includes(query)).slice(0,10);active=-1;
    list.replaceChildren();input.removeAttribute('aria-activedescendant');
    for(const person of results){
      const option=document.createElement('li');option.id=`${list.id}-${person.id}`;
      option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent=person.name;
      option.addEventListener('mousedown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(person));list.append(option);
    }
    if(!results.length){const empty=document.createElement('li');empty.textContent='Sin coincidencias';empty.setAttribute('role','option');empty.setAttribute('aria-disabled','true');list.append(empty);}
    list.hidden=false;input.setAttribute('aria-expanded','true');
  }
  input.addEventListener('input',()=>{onSelect('');show();});
  input.addEventListener('focus',show);
  input.addEventListener('blur',close);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();if(list.hidden)show();if(!results.length)return;
      active=(active+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;
      [...list.children].forEach((option,i)=>option.setAttribute('aria-selected',String(i===active)));
      input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});
    }
    if(event.key==='Enter'&&!list.hidden&&results.length){event.preventDefault();choose(results[active<0?0:active]);}
  });
  return {clear(){input.value='';close();onSelect('');}};
}
