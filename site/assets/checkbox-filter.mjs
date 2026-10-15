import {categories} from './model.mjs';

const element = target => typeof target==='string'?document.querySelector(target):target;
export const checkedValues = target => [...element(target).querySelectorAll('input:checked')].map(input=>input.value);

export function bindCheckboxFilter(target,onChange){
  const root=element(target);
  root.addEventListener('change',event=>{
    // Keep at least one option, consistently across project, network and vote filters.
    if(!checkedValues(root).length)event.target.checked=true;
    onChange();
  });
}

export function mountTypeFilter(target,onChange,{choices=categories,additional=[]}={}){
  const root=element(target);
  for(const choice of [...choices,...additional]){
    const label=document.createElement('label'),input=document.createElement('input');
    input.type='checkbox';input.value=choice.id;input.checked=true;
    label.append(input,document.createTextNode(choice.label));root.append(label);
  }
  bindCheckboxFilter(root,onChange);
}
