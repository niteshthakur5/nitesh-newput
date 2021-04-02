import forge from "node-forge";
import * as nacl from "tweetnacl";
var Buffer = require('buffer/').Buffer;

window.Dropp = (function () {
  var REDIRECT_URL_ORIGIN = "https://dropp.test-app.link";
  var REDIRECT_URL_PREFIX = `${REDIRECT_URL_ORIGIN}/p2p?`;
  var mobileAppUrl = "dropp://open/payrequest?";
  var isMobile = navigator.userAgent.match(
      /(iPhone|iPod|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini)/i
  );
  const isAndroid = navigator.userAgent.match(
    /Android/i
  );
  const isAppleDevice = navigator.userAgent.match(
    /(iPhone|iPod|iPad)/i
  );
  var CHROME_PLUGIN_URL = "https://chrome.google.com/webstore/detail/dropp-extension/hgfpnmhnmmneldokmpncjmeijkapgbbf";
  var hasExtension = false;
  var initialized = false;

  function isPageHidden() {
    var browserSpecificProps = {hidden: 1, mozHidden: 1, msHidden: 1, webkitHidden: 1};
    for (var p in browserSpecificProps) {
      if(typeof document[p] !== "undefined"){
        return document[p];
      }
    }
    return false;
  }

  function showLoadingIndicator() {
    var divElem = document.createElement("div");
    divElem.setAttribute("id", "dropp-loader");
    divElem.style = "background-color: rgba(0, 0, 0, .4);height: 100%;left: 0;position: absolute;right: 0;top: 0;z-index: 2000;";
    var loaderHTML = `<style>@keyframes spin {0% { transform: rotate(0deg); }`
    loaderHTML += `100% { transform: rotate(360deg); }}</style>`
    loaderHTML += `<div style="animation: spin 2s linear infinite;border: 3px solid  #D8D8D8;border-radius: 50%;border-top: 3px solid #9B9B9B;display: inline-block;height: 40px;width: 40px;left: 49%;position: absolute;top: 49%;"></div>`
    divElem.innerHTML = loaderHTML;
    document.body.style.position = "fixed";
    document.body.style.height = "100%";
    document.body.append(divElem);
  };

  function hideLoadingIndicator(prevBodyPosition, prevBodyHeight) {
    var droppLoader = document.getElementById("dropp-loader");
    if (droppLoader) {
      document.body.style.position = prevBodyPosition ? prevBodyPosition : "unset";
      document.body.style.height = prevBodyHeight ? prevBodyHeight : "auto";
      droppLoader.parentElement.removeChild(droppLoader);
    }
  }

  function openDroppApp(droppAppUrl, isAndroidDevice, isIOSDevice) {
    var prevBodyPosition = document.body.style.position;
    var prevBodyHeight = document.body.style.height;
    showLoadingIndicator();
    var timestamp = new Date().getTime();
    var timerDelay = 3000;
    var processingBuffer  = 500;

    setTimeout(function () {
      var elapsed = new Date().getTime() - timestamp;
      if (!(isPageHidden() || ((timerDelay + processingBuffer) < elapsed))) {
        if (isAndroidDevice) {
          window.location = "https://play.google.com/store/apps/details?id=cc.dropp.wallet";
        } else if (isIOSDevice) {
          window.location = "https://apps.apple.com/ma/app/dropp-cc/id1544894404";
        } else {
          window.location = "https://play.google.com/store/apps/details?id=cc.dropp.wallet";
        }
        hideLoadingIndicator(prevBodyPosition, prevBodyHeight);
      } else {
        hideLoadingIndicator(prevBodyPosition, prevBodyHeight);
      }
  }, timerDelay);
    window.location = droppAppUrl;
  }

  function makeIframe(url) {
    var i = document.createElement("iframe");
    i.src = url;
    document.body.append(i);
    i.hidden = true;
    i.onload = function () {
      i.parentNode.removeChild(i);
    };
  };

  function addClickEvent(aElem) {
    aElem.addEventListener("click", function (e) {
      var droppPurchaseData = this.getAttribute('data-dropp-purchase');
      if (droppPurchaseData) {
        op.openWalletOrExtensionWithUrl(droppPurchaseData);
      };
      e.preventDefault();
    });
  }

  function addMerchantSignature(privateKey, p2pObject, distribution) {
    if (privateKey.startsWith("302e020100300506032b657004220420")) {
      privateKey = privateKey.slice(32);
    }
    var bytesToSign = [Buffer.from(p2pObject.signatures.payer, "hex")];
    if (distribution) {
        var distributionUtf8 = Buffer.from(distribution, "utf-8");
        var distributionB64 = Buffer.from(distributionUtf8.toString("base64"));
        p2pObject.distributionBytes = distributionB64.toString("utf-8");
        bytesToSign.push(distributionB64);
    }
    var keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(Buffer.from(privateKey, "hex")));
    var merchantByteArray = nacl.sign.detached(
        new Uint8Array(Buffer.concat(bytesToSign)),
        keyPair.secretKey
    );
    p2pObject.signatures.merchant = Buffer.from(merchantByteArray.buffer).toString("hex");
    return p2pObject;
  }

  // public functions
  var op = {};

  op.init = function() {
    if (initialized) {
      return;
    }
    var allLinks = document.querySelectorAll("[data-dropp-purchase]");
    if (allLinks.length === 0) {
      allLinks = document.querySelectorAll(".dropp-payment");
    }
    var i = document.createElement("iframe");
    i.src = REDIRECT_URL_PREFIX;
    // i.style.position = "absolute";
    // i.height = "0";
    // i.width = "0";
    i.hidden = true;
    document.body.appendChild(i);
    window.addEventListener("message", function (event) {
      if (event.origin === REDIRECT_URL_ORIGIN) {
        if (event.data.name === "droppExtension") {
          hasExtension = true;
          console.log('Chrome extension found');
        }
      }
    });

    for (let i = 0; i < allLinks.length; i++) {
      var a = allLinks.item(i);
      const data = a.dataset.droppPurchase;
      if (!data) {
        const purchaseData = {
          amount: a.dataset.amount,
          type: a.dataset.type,
          merchantAccount: a.dataset.merchantId,
          reference: a.dataset.reference || Math.floor(Math.random() * 1000000),
          currency: a.dataset.currency || "USD",
          thumbnail: a.dataset.thumbnail,
          description: a.dataset.description,
          url: a.dataset.callbackUrl
        }
        a.setAttribute("data-dropp-purchase", op.prepareDroppPurchaseData(purchaseData));
      }
      addClickEvent(a);
    }
  };

  op.openWalletOrExtensionWithData = function(options) {
    if (options && Object.keys(options).length > 0) {
      var purchaseUrl = op.prepareDroppPurchaseData(options);
      op.openWalletOrExtensionWithUrl(purchaseUrl);
    }
  }

  op.openWalletOrExtensionWithUrl = function(droppPurchaseUrl) {
    (function (url) {
      if (isMobile) {
        openDroppApp((mobileAppUrl + url), isAndroid, isAppleDevice);
      } else if (hasExtension) {
        makeIframe(REDIRECT_URL_PREFIX + url);
      } else {
        let i = document.createElement("iframe");
        i.src = REDIRECT_URL_PREFIX;
        // i.style.position = "absolute";
        // i.height = "0";
        // i.width = "0";
        i.hidden = true;
        document.body.appendChild(i);
        i.onload = function () {
          setTimeout(function() {
            if (hasExtension) {
              i.parentNode.removeChild(i);
              makeIframe((REDIRECT_URL_PREFIX + url));
            } else {
              window.open(CHROME_PLUGIN_URL, "_blank");
            }
          }, 200);
        }
      }
    })(droppPurchaseUrl);
  };

  op.prepareDroppPurchaseData = function(options) {
    if (!options) return '';
    var esc = encodeURIComponent;
    var validQuery = Object.keys(options).filter((k) => options[k] !== null && options[k] !== '') // Remove undef. and null.
		.reduce((newObj, k) => ({ ...newObj, [k]: options[k] }), {})
    return Object.keys(validQuery)
      .map(p => esc(p) + '=' + esc(validQuery[p]))
      .join('&');
  };

  op.createPurchaseButton = function(options) {
    if (!initialized) {
      op.init();
      initialized = true;
    }
    var parentEl;
    if (options.parentElementId) {
      parentEl = document.getElementById(options.parentElementId);
    }
    if (!parentEl) {
      parentEl = document.getElementsByTagName("BODY")[0];
    }
    var existingBtns = parentEl.getElementsByClassName("dropp-payment-btn");
    for (var i = 0; i < existingBtns.length; i++) {
      existingBtns[i].remove();
    }
    var droppPurchaseData = op.prepareDroppPurchaseData(options.purchaseData);
    var buttonElem = document.createElement("button");
    buttonElem.classList.add("dropp-payment-btn");
    buttonElem.style = "cursor:pointer;color: #333333;padding: 6px 12px;vertical-align: middle;min-width: 100px;background-color:#FFFFFF; outline: none;text-shadow:none;border: 1px solid #19C2EE;border-radius: 4px;";
    buttonElem.setAttribute("data-dropp-purchase", droppPurchaseData);
    buttonElem.innerHTML = "Pay with <img src='https://i2.wp.com/dropp.cc/wp-content/uploads/2020/10/dropp-icon-footer-128x128-1.png' height='18px' style='vertical-align: initial; margin-bottom: -3px; height: 18px !important; display: inline !important' />";
    parentEl.append(buttonElem);
    addClickEvent(buttonElem);
  };

  op.makePayment = function(options) {
    let p2pObject;
    if (options.p2pData.indexOf("%") !== -1) {
        p2pObject = JSON.parse(options.p2pData);
    } else {
        let p = '';
        try {
            p = forge.util.decode64(options.p2pData).toString("utf-8");
            p2pObject = JSON.parse(p);
        } catch(err) {
            p2pObject = JSON.parse(options.p2pData);
        }
    }
    if (options.purchaseURL) {
      p2pObject.purchaseURL = options.purchaseURL;
    }
    if (options.shareURL) {
      p2pObject.shareURL = options.shareURL;
    }

    p2pObject = addMerchantSignature(options.privateKey, p2pObject, options.distribution);
    console.log(p2pObject);
    return fetch('https://dev-mps-989008488.us-east-1.elb.amazonaws.com/payment/processRequest',{
      method: 'POST',
      body: JSON.stringify({ methodName: "payMerchant", paymentData: p2pObject }),
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": options.merchantApiKey
      }
    }).then(function (response) {
      if (response.ok) {
        return Promise.resolve(response.json());
      } else {
        return Promise.reject(response);
      }
    }).catch(function (error) {
      console.warn('Something went wrong.', error);
      return Promise.reject({});
    });
  };

  return op;
})();

var Dropp = window.Dropp;
export default Dropp;