(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ids = ["fileInput","dropZone","chooseButton","fileReady","fileName","error","endpointIp","endpointPort","tunnelIp","dns","udp","cc","flag","name","result","copyButton","hint","status","shadowrocketTab","clashTab","shadowrocketPanel","clashPanel","clashHint","clashStatus","yamlPreview","downloadYamlButton","sni"];
  const e = Object.fromEntries(ids.map((id) => [id, $(id)]));
  let config = null, udpEnabled = true, clashYaml = "";
  const pemBody = (v="") => v.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, "").replace(/\s/g, "");
  const enc = (v) => encodeURIComponent(v).replace(/%2C/gi, ",");

  function applyEndpoint() { generate(); }
  function applyJsonEndpoint(value) {
	if (e.endpointIp.value === "all") return;  // 默认为all多端点
    e.endpointIp.querySelectorAll("option[data-json-endpoint]").forEach((option)=>option.remove());
    e.endpointPort.querySelectorAll("option[data-json-port]").forEach((option)=>option.remove());
    const raw=String(value||"").trim().replace(/^https?:\/\//i,"");
    const match=raw.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?$/);
    if(!match)return;
    const [,ip,jsonPort]=match;
    if(!Array.from(e.endpointIp.options).some((option)=>option.value===ip)){
      const option=document.createElement("option");option.value=ip;option.textContent=`${ip}（JSON Endpoint）`;option.dataset.jsonEndpoint="true";e.endpointIp.prepend(option);
    }
    e.endpointIp.value=ip;
    if(jsonPort){
      if(!Array.from(e.endpointPort.options).some((option)=>option.value===jsonPort)){
        const option=document.createElement("option");option.value=jsonPort;option.textContent=`${jsonPort}（JSON Port）`;option.dataset.jsonPort="true";e.endpointPort.prepend(option);
      }
      e.endpointPort.value=jsonPort;
    }
  }
  function generate() {
    if (!config || !e.endpointIp.value || !e.tunnelIp.value || !config.private_key || !config.endpoint_pub_key) {
      e.result.textContent="masque://…"; e.copyButton.disabled=true; e.yamlPreview.textContent="# 等待加载 Usque JSON…"; e.downloadYamlButton.disabled=true; return;
    }
    
    // all 多节点逻辑
    if (e.endpointIp.value === "all") {
      const allServers = ["162.159.198.2", "162.159.199.2", "2606:4700:103::2", "2606:4700:104::2",	"masque.bestcf.eu.cc", "masque1.bestcf.eu.cc", "masque2.bestcf.eu.cc", "162.159.198.1", "162.159.199.1"];
      const baseParams = [["publicKey",pemBody(config.endpoint_pub_key)],["privateKey",config.private_key.trim()],["ip",e.tunnelIp.value],["dns",e.dns.value.trim()],["udp",udpEnabled?"1":"0"],["cc",e.cc.value],["flag",e.flag.value.trim()]];
      const baseParamStr = baseParams.map(([k,v])=>`${k}=${enc(v)}`).join("&");
      
      // Shadowrocket: 多个masque://链接，换行分隔
		const masqueUrls = allServers.map(server => {
		  const host = server.includes(':') ? `[${server}]` : server;
		  return `masque://${host}:${e.endpointPort.value}?${baseParamStr}#${enc(e.name.value.trim()||"WARP-MASQUE")}`;
		}).join("\n");
      e.result.textContent = masqueUrls;
      e.copyButton.disabled = false;
      e.hint.textContent = "已完成转换，可以直接复制并导入 Shadowrocket。";
      e.status.textContent = "准备就绪";
      e.status.classList.add("ready");
      
      // Clash: 多个proxy节点
      const clashDns = e.dns.value.split(/[\s,]+/).filter(Boolean).join(", ");
      const clashNodes = allServers.map((server, index) => {
        return `  - name: "MASQUE${index + 1} - Masque.pages.dev"
    type: masque
    server: ${server}
    port: ${e.endpointPort.value}
    private-key: ${config.private_key.trim()}
    public-key: ${pemBody(config.endpoint_pub_key)}
    ip: ${e.tunnelIp.value}
    mtu: 1280
    udp: ${udpEnabled}
    remote-dns-resolve: true
    congestion-controller: ${e.cc.value}
    dns: [ ${clashDns} ]
    sni: ${e.sni.value}`; // 新增SNI;单IP非All未增加cc字段用于A/B测试
      }).join("\n\n");
      
      // clashYaml = window.MIHOMO_MASQUE_TEMPLATE.replace(/^proxies:.*$/m, `proxies:\n${clashNodes}`);
		clashYaml = window.MIHOMO_MASQUE_TEMPLATE.replace(
		  /^proxies:[\s\S]*?(?=\n# 机场配置模块)/m,
		  `proxies:\n${clashNodes}\n\n`
		);  //剔除All下的示例节点
      e.yamlPreview.textContent = clashYaml;
      e.downloadYamlButton.disabled = false;
      e.clashHint.textContent = "已套用目前 Endpoint 与 usque 密钥，可直接下载并导入 Clash。";
      e.clashStatus.textContent = "准备就绪";
      e.clashStatus.classList.add("ready");
      return;
    }
    
    // 原有单节点逻辑
    const params = [["publicKey",pemBody(config.endpoint_pub_key)],["privateKey",config.private_key.trim()],["ip",e.tunnelIp.value],["dns",e.dns.value.trim()],["udp",udpEnabled?"1":"0"],["cc",e.cc.value],["flag",e.flag.value.trim()]].map(([k,v])=>`${k}=${enc(v)}`).join("&");
	const host = e.endpointIp.value.includes(':') ? `[${e.endpointIp.value}]` : e.endpointIp.value;
	e.result.textContent=`masque://${host}:${e.endpointPort.value}?${params}#${enc(e.name.value.trim()||"WARP-MASQUE")}`;
    e.copyButton.disabled=false; e.hint.textContent="已完成转换，可以直接复制并导入 Shadowrocket。"; e.status.textContent="准备就绪"; e.status.classList.add("ready");
    const clashDns=e.dns.value.split(/[\s,]+/).filter(Boolean).join(", ");
    clashYaml=window.MIHOMO_MASQUE_TEMPLATE.replace(/^(\s{4}server:)\s*.*$/m,`$1 ${e.endpointIp.value}`).replace(/^(\s{4}port:)\s*.*$/m,`$1 ${e.endpointPort.value}`).replace(/^(\s{4}private-key:)\s*.*$/m,`$1 ${config.private_key.trim()}`).replace(/^(\s{4}public-key:)\s*.*$/m,`$1 ${pemBody(config.endpoint_pub_key)}`).replace(/^(\s{4}ip:)\s*.*$/m,`$1 ${e.tunnelIp.value}`).replace(/^(\s{4}udp:)\s*.*$/m,`$1 ${udpEnabled}`).replace(/^(\s{4}remote-dns-resolve:)\s*.*$/m,"$1 true").replace(/^(\s{4}congestion-controller:)\s*.*$/m, `$1 ${e.cc.value}`).replace(/^(\s{4}dns:)\s*.*$/m,`$1 [ ${clashDns} ]\n    sni: ${e.sni.value}`);
    e.yamlPreview.textContent=clashYaml; e.downloadYamlButton.disabled=false; e.clashHint.textContent="已套用目前 Endpoint 与 usque 密钥，可直接下载并导入 Clash。"; e.clashStatus.textContent="准备就绪"; e.clashStatus.classList.add("ready");
  }
  async function load(file) {
    if (!file) return; e.error.textContent="";
    try {
      const c=JSON.parse(await file.text());
      const missing=["private_key","endpoint_pub_key","ipv4"].filter((k)=>!c[k]);
      if(missing.length) throw new Error(`缺少必要字段：${missing.join(", ")}`);
      config=c; e.tunnelIp.value=c.ipv4; e.fileName.textContent=file.name; e.fileReady.hidden=false;
      applyJsonEndpoint(c.endpoint_v4);
      generate();
    } catch(err) { config=null; e.fileReady.hidden=true; e.error.textContent=err instanceof Error?err.message:"无法解析 JSON"; generate(); }
  }
  e.endpointIp.addEventListener("change",applyEndpoint); e.endpointPort.addEventListener("change",applyEndpoint); applyEndpoint();
  function showPlatform(platform){const clash=platform==="clash";e.shadowrocketPanel.hidden=clash;e.clashPanel.hidden=!clash;e.shadowrocketTab.classList.toggle("active",!clash);e.clashTab.classList.toggle("active",clash)}
  e.shadowrocketTab.addEventListener("click",()=>showPlatform("shadowrocket"));e.clashTab.addEventListener("click",()=>showPlatform("clash"));
  e.chooseButton.addEventListener("click",(x)=>{x.stopPropagation();e.fileInput.click()}); e.dropZone.addEventListener("click",()=>e.fileInput.click());
  e.dropZone.addEventListener("keydown",(x)=>{if(x.key==="Enter"||x.key===" ")e.fileInput.click()}); e.fileInput.addEventListener("change",()=>load(e.fileInput.files[0]));
  e.dropZone.addEventListener("dragover",(x)=>{x.preventDefault();e.dropZone.classList.add("dragging")}); e.dropZone.addEventListener("dragleave",()=>e.dropZone.classList.remove("dragging"));
  e.dropZone.addEventListener("drop",(x)=>{x.preventDefault();e.dropZone.classList.remove("dragging");load(x.dataTransfer.files[0])});
  e.udp.addEventListener("click",()=>{udpEnabled=!udpEnabled;e.udp.classList.toggle("on",udpEnabled);e.udp.setAttribute("aria-checked",String(udpEnabled));generate()});
  [e.dns,e.cc,e.flag,e.name].forEach((x)=>x.addEventListener("input",generate));
  e.sni.addEventListener("change", generate);
  e.copyButton.addEventListener("click",async()=>{await navigator.clipboard.writeText(e.result.textContent);const old=e.copyButton.innerHTML;e.copyButton.innerHTML="✓<br><strong>已复制</strong>";setTimeout(()=>e.copyButton.innerHTML=old,1500)});
  e.downloadYamlButton.addEventListener("click",()=>{if(!clashYaml)return;const blob=new Blob([clashYaml],{type:"application/yaml;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="Mihomo-Masque.yaml";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)});
})();

// 一键秒注册：请求 + 填充
document.getElementById('quickRegisterBtn')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const btn = this;
    const originalText = btn.textContent;
    btn.textContent = '⏳ 注册中...';
    btn.disabled = true;

    try {
        const resp = await fetch('https://usque-register-server.pages.dev/claim?raw=true');
        const data = await resp.json();

        if (!data.success) {
            alert('⚠️ ' + (data.message || '注册失败'));
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        // ✅ 修复：统一处理文件名，去掉原有的 .json 后缀再拼接
        const baseName = data.id.replace(/\.json$/i, '');
        const fileName = `${baseName}.json`;

        const jsonContent = JSON.stringify(data.content, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);

        const fileInput = document.getElementById('fileInput');
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));

        const statusEl = document.querySelector('#clashStatus') || document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = '✅ 已自动加载';
            statusEl.style.color = 'var(--matrix-green)';
        }

        btn.textContent = '已注册 已拖放';
        setTimeout(() => {
            btn.disabled = true;
        }, 2000);

    } catch (err) {
        alert('❌ 网络错误，请稍后重试');
        btn.textContent = originalText;
        btn.disabled = false;
    }
});