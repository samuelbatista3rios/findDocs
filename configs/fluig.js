var rp = require("request-promise");
var CONSUMER_KEY = process.env.CONSUMER_KEY
var CONSUMER_SECRET = process.env.CONSUMER_SECRET
var TOKEN = process.env.TOKEN
var TOKEN_SECRET = process.env.TOKEN_SECRET

var config = {
    prod: {
        token: "6398f5c8-ae2a-447a-8286-9f9b6d9572ca",
        token_secret: "fffb4cc5-c60b-4f4e-a3ea-f82fec5bdea62331dabc-eed7-4395-87d5-5b1f46ffd974",
        consumer_key: "acessos_externos",
        consumer_secret: "acessos_externos",
        signature_method: "HMAC-SHA1"
    },
    test: {
        token: "64f348e6-e0eb-4423-8150-2dd2b110c9f2",
        token_secret: "8a728e0a-ac71-4de3-aae0-d6647e6aa0b1e5d7da58-4a8a-4a72-85e1-29ec674bdf89",
        consumer_key: "acessos_externos",
        consumer_secret: "acessos_externos",
        signature_method: "HMAC-SHA1"
    }
}

var urlConfig = {
    prod: "https://fluig.hmtj.org.br:8443",
    test: "https://fluignovo.hmtj.org.br:8085"
}

var api = (url, method, body, env) => {
    var options = {
        method: method,
        url: urlConfig[env] + url,
        body: body,
        oauth: config[env],
        json: true
    };

    return rp(options);
}

module.exports = api;