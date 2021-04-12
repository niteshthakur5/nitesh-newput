 var Dropp = (function () {
  var REDIRECT_URL_ORIGIN = "https://dropp.test-app.link";
  var REDIRECT_URL_PREFIX = `${REDIRECT_URL_ORIGIN}/p2p?`;
  var paymentLinkClass = 'dropp-payment';
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

  function processClick(payElem) {
    var droppPurchaseData = payElem.getAttribute('data-dropp-purchase');
      if (!droppPurchaseData) {
        const purchaseData = {
          amount: payElem.dataset.amount,
          title: payElem.dataset.title,
          type: payElem.dataset.type,
          merchantAccount: payElem.dataset.merchantId,
          reference: payElem.dataset.reference || Math.floor(Math.random() * 1000000),
          currency: payElem.dataset.currency || "USD",
          thumbnail: payElem.dataset.thumbnail,
          description: payElem.dataset.description,
          url: payElem.dataset.callbackUrl
        }
        if (purchaseData.merchantAccount) {
          droppPurchaseData = op.prepareDroppPurchaseData(purchaseData);
        }
      }
      if (droppPurchaseData) {
        op.openWalletOrExtensionWithUrl(droppPurchaseData);
      };
  }

  // function addClickEvent(aElem) {
  //   aElem.addEventListener("click", function (e) {
  //     processClick(this);
  //     e.preventDefault();
  //   });
  // }

  // public functions
  var op = {};

  op.init = function() {
    if (initialized) {
      return;
    }
    var i = document.createElement("iframe");
    i.src = REDIRECT_URL_PREFIX;
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

    var rootElement = document.querySelector('body');
    rootElement.addEventListener("click", function(event) {
      if (event.target.classList.contains(paymentLinkClass) || event.target.dataset.hasOwnProperty("droppPurchase")) {
        processClick(event.target);
        event.stopPropagation();
      }
    });

    // var allLinks = document.querySelectorAll("[data-dropp-purchase]");
    // if (allLinks.length === 0) {
    //   allLinks = document.querySelectorAll(".dropp-payment");
    // }


    // for (let i = 0; i < allLinks.length; i++) {
    //   var a = allLinks.item(i);
    //   // const data = a.dataset.droppPurchase;
    //   // if (!data) {
    //   //   const purchaseData = {
    //   //     amount: a.dataset.amount,
    //   //     type: a.dataset.type,
    //   //     merchantAccount: a.dataset.merchantId,
    //   //     reference: a.dataset.reference || Math.floor(Math.random() * 1000000),
    //   //     currency: a.dataset.currency || "USD",
    //   //     thumbnail: a.dataset.thumbnail,
    //   //     description: a.dataset.description,
    //   //     url: a.dataset.callbackUrl
    //   //   }
    //   //   a.setAttribute("data-dropp-purchase", op.prepareDroppPurchaseData(purchaseData));
    //   // }
    //   addClickEvent(a);
    // }
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
    var existingBtns = parentEl.getElementsByClassName(paymentLinkClass);
    for (var i = 0; i < existingBtns.length; i++) {
      existingBtns[i].remove();
    }
    var droppPurchaseData = op.prepareDroppPurchaseData(options.purchaseData);
    var buttonElem = document.createElement("button");
    buttonElem.classList.add(paymentLinkClass);
    buttonElem.style = "cursor:pointer;color: #333333;padding: 6px 12px;vertical-align: middle;min-width: 100px;background-color:#FFFFFF; outline: none;text-shadow:none;border: 1px solid #19C2EE;border-radius: 4px;";
    buttonElem.setAttribute("data-dropp-purchase", droppPurchaseData);
    buttonElem.innerHTML = "Pay with <img src='https://i2.wp.com/dropp.cc/wp-content/uploads/2020/10/dropp-icon-footer-128x128-1.png' height='18px' style='vertical-align: initial; margin-bottom: -3px; height: 18px !important; display: inline !important' />";
    parentEl.append(buttonElem);
    // addClickEvent(buttonElem);
  };

  window.onload = op.init;
  return op;
})();

window.Dropp = Dropp;
export default Dropp;