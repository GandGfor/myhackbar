const elMethod = document.getElementById('method');
const elUrl = document.getElementById('url');
const elHeaders = document.getElementById('headers');
const elBody = document.getElementById('body');
const elEnableHeaders = document.getElementById('enableHeaders');
const elEnableBody = document.getElementById('enableBody');
const elSyncPage = document.getElementById('syncPage');
const elResponseStatus = document.getElementById('responseStatus');
const elResponseHeaders = document.getElementById('responseHeaders');
const elResponseBody = document.getElementById('responseBody');
const elSyncStatus = document.getElementById('syncStatus');

function parseHeaders(text) {
  const headers = {};
  if (!text) return headers;
  text.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      if (key) headers[key] = val;
    }
  });
  return headers;
}

// [已改变] 核心：将响应写入浏览器页面（实时同步，不跳转）
// 使用 document.write 重写整个页面，这是最稳定的方法
function syncToPage(content, contentType) {
  // 使用 JSON.stringify 安全转义所有特殊字符，注入到 eval 字符串中
  const safeContent = JSON.stringify(content);

  // 修改后的逻辑：
  // 直接使用 document.open/write/close 重写页面
  // 这是浏览器原生的、最稳定的方法
  const code = `(function(){
    try {
      var html = ${safeContent};
      
      // 重写整个页面
      document.open();
      document.write(html);
      document.close();
      
      return 'OK';
    } catch(e) {
      return 'ERROR:' + e.message;
    }
  })()`;

  chrome.devtools.inspectedWindow.eval(code, (result, exInfo) => {
    if (exInfo && exInfo.isException) {
      elSyncStatus.textContent = '❌ 页面同步失败: ' + exInfo.value;
      elSyncStatus.className = 'err';
    } else if (result && result.startsWith && result.startsWith('ERROR:')) {
      elSyncStatus.textContent = '❌ 页面同步失败: ' + result;
      elSyncStatus.className = 'err';
    } else {
      elSyncStatus.textContent = '✅ 页面已实时同步';
      elSyncStatus.className = 'ok';
    }
  });
}

// 发送请求
document.getElementById('btnSend').addEventListener('click', () => {
  const method = elMethod.value;
  const url = elUrl.value.trim();

  if (!url) {
    elResponseStatus.textContent = '❌ 请输入URL';
    elResponseStatus.className = 'status-err';
    return;
  }

  const headers = elEnableHeaders.checked ? parseHeaders(elHeaders.value) : {};
  const body = (elEnableBody.checked && method !== 'GET' && method !== 'HEAD')
    ? elBody.value : null;

  elResponseStatus.textContent = '⏳ 请求中...';
  elResponseStatus.className = '';
  elResponseHeaders.textContent = '';
  elResponseBody.textContent = '';
  elSyncStatus.textContent = '';

  chrome.runtime.sendMessage(
    { type: 'HACKBAR_REQUEST', data: { method, url, headers, body } },
    (response) => {
      if (chrome.runtime.lastError) {
        elResponseStatus.textContent = '❌ 通信错误: ' + chrome.runtime.lastError.message;
        elResponseStatus.className = 'status-err';
        return;
      }
      if (!response) {
        elResponseStatus.textContent = '❌ 无响应，请重新加载插件';
        elResponseStatus.className = 'status-err';
        return;
      }
      if (!response.success) {
        elResponseStatus.textContent = '❌ 请求失败: ' + response.error;
        elResponseStatus.className = 'status-err';
        return;
      }

      // 显示状态
      elResponseStatus.textContent = `✅ ${response.status} ${response.statusText}`;
      elResponseStatus.className = response.status < 400 ? 'status-ok' : 'status-err';

      // 显示响应头
      let headerText = '';
      const contentType = response.headers['content-type'] || '';
      for (const [key, val] of Object.entries(response.headers)) {
        headerText += `${key}: ${val}\n`;
      }
      elResponseHeaders.textContent = headerText;

      // 显示响应体
      let bodyText = response.body;
      try {
        const json = JSON.parse(response.body);
        bodyText = JSON.stringify(json, null, 2);
      } catch {}
      elResponseBody.textContent = bodyText;

      // 同步到浏览器页面
      if (elSyncPage.checked) {
        syncToPage(response.body, contentType);
      }
    }
  );
});

// 加载当前页面URL
document.getElementById('btnLoadUrl').addEventListener('click', () => {
  chrome.devtools.inspectedWindow.eval('location.href', (result) => {
    if (result) elUrl.value = result;
  });
});

// 工具按钮
document.getElementById('btnBase64Enc').addEventListener('click', () => {
  elBody.value = btoa(unescape(encodeURIComponent(elBody.value)));
});
document.getElementById('btnBase64Dec').addEventListener('click', () => {
  try {
    elBody.value = decodeURIComponent(escape(atob(elBody.value)));
  } catch { alert('Base64解码失败'); }
});
document.getElementById('btnUrlEnc').addEventListener('click', () => {
  elBody.value = encodeURIComponent(elBody.value);
});
document.getElementById('btnUrlDec').addEventListener('click', () => {
  try {
    elBody.value = decodeURIComponent(elBody.value);
  } catch { alert('URL解码失败'); }
});
document.getElementById('btnClear').addEventListener('click', () => {
  elUrl.value = '';
  elHeaders.value = '';
  elBody.value = '';
  elResponseStatus.textContent = '';
  elResponseHeaders.textContent = '';
  elResponseBody.textContent = '';
  elSyncStatus.textContent = '';
});
