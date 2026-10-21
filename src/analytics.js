
const id=String(import.meta.env.VITE_GA_MEASUREMENT_ID||'').trim();
if(/^G-[A-Z0-9]{5,20}$/.test(id)){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());
  window.gtag('config',id,{anonymize_ip:true});
  const script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
  document.head.append(script);
  window.addEventListener('rizupita:analytics',event=>{
    const detail=event.detail;
    if(detail&&/^[a-z][a-z0-9_]{1,40}$/.test(detail.name)){
      window.gtag('event',detail.name,detail.params||{});
    }
  });
}
