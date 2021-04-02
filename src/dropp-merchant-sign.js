import forge from "node-forge";
import * as nacl from "tweetnacl";
var Buffer = require('buffer/').Buffer;

window.DroppMerchant = (function () {
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

  op.makePayment = function(privateKey, p2pData, purchaseURL, distribution) {
    let p2pObject;
    if (p2pData.indexOf("%") !== -1) {
        p2pObject = JSON.parse(p2pData);
    } else {
        let p = '';
        try {
            p = forge.util.decode64(p2pData).toString("utf-8");
            p2pObject = JSON.parse(p);
        } catch(err) {
            p2pObject = JSON.parse(p2pData);
        }
    }
    if (purchaseURL) {
      p2pObject.purchaseURL = `${purchaseURL}`;
    }

    console.log(p2pObject);
    p2pObject = addMerchantSignature(privateKey, p2pObject, distribution);
    console.log(p2pObject);
    return fetch('http://18.206.191.75:6001/payment/processRequest',{
      method: 'POST',
      body: JSON.stringify({ methodName: "payMerchant", paymentData: p2pObject }),
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "043eecc9a20aaf98e2052013cc1a5386755e6e9d"
      }
    }).then(function (response) {
      console.log(response);
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