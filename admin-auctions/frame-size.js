(function(){
 function resize(){if(window.parent===window)return;window.parent.postMessage({type:'road-iron-auction-frame-size',height:Math.ceil(document.body.getBoundingClientRect().height)},location.origin);}
 new ResizeObserver(resize).observe(document.body);window.addEventListener('load',resize);resize();
})();
