var Dropp = (function () {
  var REDIRECT_URL_ORIGIN = "https://dropp.test-app.link";
  var REDIRECT_URL_PREFIX = `${REDIRECT_URL_ORIGIN}/p2p?`;
  var isMobile = navigator.userAgent.match(
      /(iPhone|iPod|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini)/i
  );
  var CHROME_PLUGIN_URL = "https://chrome.google.com/webstore/detail/dropp-extension/hgfpnmhnmmneldokmpncjmeijkapgbbf";
  var hasExtension = false;

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
      e.preventDefault();
      var droppPurchaseData = this.getAttribute('data-dropp-purchase');
      if (droppPurchaseData) {
        op.openWalletOrExtensionWithUrl(droppPurchaseData);
      };
    });
  }

  // public functions
  var op = {};

  op.init = function() {
    var allLinks = document.querySelectorAll("[data-dropp-purchase]");
    if (allLinks.length === 0) {
      allLinks = document.querySelectorAll(".dropp-payment");
    }
    if (allLinks.length === 0) {
        return;
    } else {
      var i = document.createElement("iframe");
      i.src = REDIRECT_URL_PREFIX;
      i.style.position = "absolute";
      i.height = "0";
      i.width = "0";
      document.body.appendChild(i);
      window.addEventListener("message", function (event) {
        if (event.origin === REDIRECT_URL_ORIGIN) {
          if (event.data.name === "droppExtension") {
            hasExtension = true;
            console.log('Chrome extension found');
          }
        }
      });
    }

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
        window.location.href = url;
      } else if (hasExtension) {
        makeIframe(url);
      } else {
        var i = document.createElement("iframe");
        i.src = REDIRECT_URL_PREFIX;
        i.style.position = "absolute";
        i.height = "0";
        i.width = "0";
        document.body.appendChild(i);
        i.onload = function () {
          setTimeout(function() {
            if (hasExtension) {
              i.parentNode.removeChild(i);
              makeIframe(url);
            } else {
              window.location.href = CHROME_PLUGIN_URL;
            }
          }, 200);
        }
      }
    })(REDIRECT_URL_PREFIX + droppPurchaseUrl);
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

  op.addPurchaseLink = function(parentEl, options) {
    if (!parentEl) {
      throw "Parent Element is missing";
    }
    var droppPurchaseData = op.prepareDroppPurchaseData(options);
    var aElem = document.createElement("a");
    aElem.classList.add("dropp-payment");
    aElem.style = "text-decoration:underline;cursor:pointer;";
    aElem.setAttribute("data-dropp-purchase", droppPurchaseData);
    aElem.innerHTML = "Pay with <img src='https://i2.wp.com/dropp.cc/wp-content/uploads/2020/10/dropp-icon-footer-128x128-1.png' height='18px' style='vertical-align: initial; margin-bottom: -2px; height: 18px !important; display: inline !important' /> $" + options.amount;
    parentEl.appendChild(aElem);
    addClickEvent(aElem);
  };

  return op;
})();

module.exports = Dropp;