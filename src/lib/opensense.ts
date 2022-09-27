import axios from 'axios';
import https from 'https';

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

const HTTP_SUCCESS = [200, 201, 202, 203, 204, 205, 206, 207];

class OPNSenseClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;
    private verifyCert: boolean;
    private useHttps: boolean;
    private getOptions: () => { baseURL: string; auth: { password: string; username: string }, body?: string };

    constructor(apiKey: string, apiSecret: string, baseUrl: string, verifyCert = false) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = (baseUrl[baseUrl.length - 1] == '/') ? baseUrl : baseUrl + '/';
        this.verifyCert = verifyCert;

        this.useHttps = baseUrl.startsWith('https');

        this.getOptions = () => {
            return {
                baseURL: this.baseUrl,
                auth: {
                    username: this.apiKey,
                    password: this.apiSecret
                }
            };
        };
    }

    async get(url: string, parseJSON = true): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = this.getOptions();

            axiosInstance.get(url, options)
                .then((response) => {
                    // handle success
                    resolve(response.data || {});
                })
                .catch((error) => {
                    // handle error
                    reject(error);
                })
                .finally(() => {
                })
        });
    }

    async post(url: string, body: string | object, parseJSON = true): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = this.getOptions();
            options.body = typeof body === 'string' ? body : JSON.stringify(body);

            axiosInstance.post(url, options)
                .then((response) => {
                    // handle success
                    resolve(response.data || {});
                })
                .catch((error) => {
                    // handle error
                    reject(error);
                })
                .finally(() => {
                })
        });
    }
}

export default OPNSenseClient;
