chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HACKBAR_REQUEST') {
    const { method, url, headers, body } = message.data;

    const options = {
      method: method,
      headers: headers || {}
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      options.body = body;
    }

    fetch(url, options)
      .then(async (res) => {
        const text = await res.text();
        const responseHeaders = {};
        res.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        sendResponse({
          success: true,
          status: res.status,
          statusText: res.statusText,
          headers: responseHeaders,
          body: text
        });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }
});
