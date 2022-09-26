import axios, {AxiosError} from 'axios'

/**
 * Checks if a JavaScript value is empty
 * @example
 *    isEmpty(null); // true
 *    isEmpty(undefined); // true
 *    isEmpty(''); // true
 *    isEmpty([]); // true
 *    isEmpty({}); // true
 * @param {any} value - item to test
 * @returns {boolean} true if empty, otherwise false
 */
function isEmpty(value: any) {
	return (
		value === null || // check for null
		value === undefined || // check for undefined
		value === '' || // check for empty string
		(Array.isArray(value) && value.length === 0) || // check for empty array
		(typeof value === 'object' && Object.keys(value).length === 0) // check for empty object
	);
}

/**
 * Tests whether the given variable is a real object and not an Array
 * @param {any} it The variable to test
 * @returns {it is Record<string, any>}
 */
function isObject(it: any) {
	// This is necessary because:
	// typeof null === 'object'
	// typeof [] === 'object'
	// [] instanceof Object === true
	return Object.prototype.toString.call(it) === '[object Object]';
}

/**
 * Tests whether the given variable is really an Array
 * @param {any} it The variable to test
 * @returns {it is any[]}
 */
function isArray(it: any) {
	if (typeof Array.isArray === 'function') return Array.isArray(it);
	return Object.prototype.toString.call(it) === '[object Array]';
}

/**
 * Translates text to the target language. Automatically chooses the right translation API.
 * @param {string} text The text to translate
 * @param {string} targetLang The target languate
 * @param {string} [yandexApiKey] The yandex API key. You can create one for free at https://translate.yandex.com/developers
 * @returns {Promise<string>}
 */
async function translateText(text: string, targetLang: string, yandexApiKey: string) {
	if (targetLang === 'en') {
		return text;
	} else if (!text) {
		return '';
	}
	if (yandexApiKey) {
		return translateYandex(text, targetLang, yandexApiKey);
	} else {
		return translateGoogle(text, targetLang);
	}
}

/**
 * Translates text with Yandex API
 * @param {string} text The text to translate
 * @param {string} targetLang The target languate
 * @param {string} apiKey The yandex API key. You can create one for free at https://translate.yandex.com/developers
 * @returns {Promise<string>}
 */
async function translateYandex(text: string, targetLang: string, apiKey: string) {
	if (targetLang === 'zh-cn') {
		targetLang = 'zh';
	}
	try {
		const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${encodeURIComponent(text)}&lang=en-${targetLang}`;
		const response = await axios({url, timeout: 15000});
		if (response.data && response.data.text && isArray(response.data.text)) {
			return response.data.text[0];
		}
		throw new Error('Invalid response for translate request');
	} catch (e) {
		throw new Error(`Could not translate to "${targetLang}": ${e}`);
	}
}

/**
 * Translates text with Google API
 * @param {string} text The text to translate
 * @param {string} targetLang The target languate
 * @returns {Promise<string>}
 */
async function translateGoogle(text: string, targetLang: string) {
	try {
		const url = `http://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}&ie=UTF-8&oe=UTF-8`;
		const response = await axios({url, timeout: 15000});
		if (isArray(response.data)) {
			// we got a valid response
			return response.data[0][0][0];
		}
		throw new Error('Invalid response for translate request');
	} catch (e: any) {
		throw new Error(`Could not translate to "${targetLang}": ${e.message}`)
	}
}

if (typeof String.prototype.toCamelCase !== 'function') {
	String.prototype.toCamelCase = function () {
		return this.replace(/^([A-Z])|[\s-_](\w)/g, function (match, p1, p2, offset) {
			if (p2) return p2.toUpperCase();
			return p1.toLowerCase();
		});
	};
}

export {
	isEmpty,
	isArray,
	isObject
};
