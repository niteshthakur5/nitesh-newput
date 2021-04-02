import forge from "node-forge";
import * as nacl from "tweetnacl";

export default DroppMerchant = (function () {
  var Buffer = require('buffer/').Buffer;

  function addMerchantSignature(privateKey, p2pObject, distribution) {
    if (privateKey.startsWith("302e020100300506032b657004220420")) {
      privateKey = privateKey.slice(32);
    }
    var bytesToSign = [forge.util.hexToBytes(p2pObject.signatures.payer)];
    if (distribution) {
        var distributionUtf8 = Buffer.from(distribution, "utf-8");
        var distributionB64 = Buffer.from(distributionUtf8.toString("base64"));
        p2pObject.distributionBytes = distributionB64.toString("utf-8");
        bytesToSign.push(distributionB64);
    }
    var keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(forge.util.hexToBytes(signingKey)));
    var merchantByteArray = nacl.sign.detached(
        new Uint8Array(Buffer.concat(bytesToSign)),
        keyPair.secretKey
    );
    p2pObject.signatures.merchant = Buffer.from(merchantByteArray.buffer).toString("hex");
    // p2pObject.signatures.merchant = p2pObject.signatures.payer;
    return p2pObject;
  }

  // public functions
  var op = {};

  op.makePayment = function(privateKey, p2pData) {
    let p = '';
    let p2pObject;
    try {
        p = forge.util.decode64(p2pData).toString("utf-8");
        p2pObject = JSON.parse(p);
    } catch(err) {
        p2pObject = JSON.parse(p);
    }
    console.log(p2pObject);
    p2pObject = addMerchantSignature(privateKey, p2pObject);
    console.log(p2pObject);
    return fetch('http://18.206.191.75:6001//payment/processRequest',{
      method: 'POST',
      body: JSON.stringify({ methodName: "payMerchant", paymentData: p2pObject }),
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "043eecc9a20aaf98e2052013cc1a5386755e6e9d"
      }
    }).then(function (response) {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    }).then(function (data) {
      console.log(data);
    }).catch(function (error) {
      console.warn('Something went wrong.', error);
    });
  };

  return op;
})();