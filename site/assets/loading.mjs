// Shared placeholders for the initial data load and the two lazy sections.
export function skeletonMarkup(kind='chart'){
  const line='<div class="skeleton-block skeleton-line"></div>';
  const controls='<div class="skeleton-controls"><i class="skeleton-block"></i><i class="skeleton-block"></i><i class="skeleton-block"></i></div>';
  const card=`<div class="skeleton-card">${line}${line}<div class="skeleton-block skeleton-card-chart"></div></div>`;
  let body;
  if(kind==='cards')body=`<div class="skeleton-cards">${card.repeat(6)}</div>`;
  else if(kind==='list')body=`<div class="skeleton-list">${card.repeat(3)}</div>`;
  else if(kind==='overview')body=`<div class="skeleton-metrics">${'<i class="skeleton-block"></i>'.repeat(4)}</div><div class="skeleton-charts"><div class="skeleton-block skeleton-plot"></div><div class="skeleton-block skeleton-plot"></div></div>`;
  else if(kind==='map')body='<div class="skeleton-map"><div class="skeleton-block skeleton-plot"></div><div class="skeleton-card">'+line+line+'<div class="skeleton-block skeleton-card-chart"></div>'+line+'</div></div>';
  else body='<div class="skeleton-block skeleton-plot"></div>';
  return `<div class="skeleton" aria-hidden="true">${controls}${body}</div>`;
}

export function loadingMarkup(kind,message){
  return `<p class="sr-only" role="status">${message}</p>${skeletonMarkup(kind)}`;
}
