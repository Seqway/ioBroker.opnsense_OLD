const https = require('https');
const axios = require('axios').create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

const HTTP_SUCCESS = [200, 201, 202, 203, 204, 205, 206, 207];

class OPNSenseClient {

    constructor(apiKey, apiSecret, baseUrl, verifyCert = false) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = (baseUrl[baseUrl.length - 1] == '/') ? baseUrl : baseUrl + '/';
        this.verifyCert = verifyCert;

        this.useHttps = baseUrl.includes('https');

        this.getOptions = () => {
            return {
                baseURL: this.baseUrl,
                auth: {
                    username: this.apiKey,
                    password: this.apiSecret
                }
            }
        }
    }

    async get(url, parseJSON = true) {
        return new Promise((resolve, reject) => {
            var options = this.getOptions();

            axios.get(url, options)
              .then(function (response) {
                  // handle success
                  console.info(response);
                  resolve(response.data || {});
              })
              .catch(function (error) {
                  // handle error
                  console.error(error);
                  reject(error)
              })
              .then(function () {
                  // always executed
              }
            );
        });
    }

    async post(endpoint, body, parseJSON = true) {
        return new Promise((resolve, reject) => {
            var options = this.getOptions();
            options.body = body;

            request.post(this.getUrl(endpoint), options, (err, res, body) => {
                if (!err) {
                    if (HTTP_SUCCESS.includes(res.statusCode)) {
                        try {
                            resolve(parseJSON ? JSON.parse(body) : body);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject('Not Successful');
                    }
                } else {
                    reject(err);
                }
            });
        });
    }
}

module.exports = OPNSenseClient;
