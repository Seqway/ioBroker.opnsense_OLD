'use strict';

/*
 * Created with @iobroker/create-adapter v2.0.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter

import * as utils from "@iobroker/adapter-core";
import {config, OPNSenseCommandConfig, OPNSenseControllerConfig, OPNSenseModuleConfig} from "./lib/config";
import OPNSenseClient from "./lib/opensense";
import {isArray, isEmpty, isObject} from './lib/tools';

const interval = '10';

// Load your modules here, e.g.:
// const fs = require("fs");

class Opnsense extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'opnsense'
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    protected onUnload(callback: () => void) {
        this.log.debug("OPNSense adapter unloading")
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    protected onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    protected async onReady(): Promise<void> {
        // Initialize folders
        this.log.debug("OPNSense adapter creating states")
        config.modules && config.modules.forEach((module: OPNSenseModuleConfig) => {
            this.log.debug("[OPNSense] creating module " + module.name)
            this.setObjectNotExistsAsync(module.name, {
                type: 'folder', common: {
                    name: module.name, read: true, write: true
                }, native: {}
            }).then(moduleChannel => {

                module && module.controllers.forEach((controller: OPNSenseControllerConfig) => {
                    this.log.debug("[OPNSense] creating controller " + controller.name)
                    this.setObjectNotExistsAsync(module.name + '.' + controller.name, {
                        type: 'folder', common: {
                            name: controller.name, read: true, write: true
                        }, native: {}
                    }).then(controllerChannel => {
                        controller && controller.commands.forEach((command: OPNSenseCommandConfig) => {
                            this.setObjectNotExistsAsync(module.name + '.' + controller.name + '.' + command.name, {
                                type: 'channel',
                                common: {
                                    name: command.name,
                                    desc: command.desc || command.name
                                }, native: {}
                            });
                        });
                    });
                });
            }).catch(e => {
                this.log.error(e.message)
            });
        });

        if (this.config.apikey && this.config.apisecret && this.config.OPNSense_ServerIp) {
            this.log.debug("using https://" + this.config.OPNSense_ServerIp)
            const client = new OPNSenseClient(this.config.apikey, this.config.apisecret, "https://" + this.config.OPNSense_ServerIp + "/api")

            config.modules && config.modules.forEach((module: OPNSenseModuleConfig) => {
                module && module.controllers.forEach((controller: OPNSenseControllerConfig) => {
                    controller && controller.commands.forEach(command => {
                        this.log.info('call ' + command.name);
                        let url = command.url;
                        if (isEmpty(url)) {
                            url = `${module.name}/${controller.name}/${command.name}`.toLowerCase();
                        }
                        const method = command.method.toLowerCase() || 'get';

                        switch (method) {
                            case 'get':
                                this.log.debug(`GET ${url}`)
                                client.get(url)
                                    .then(async (result: object) => {
                                        //this.log.silly(JSON.stringify(result))
                                        let transformed = result;
                                        if (typeof command.transform === 'function') {
                                            transformed = command.transform(transformed);
                                        }

                                        transformed = this.removeIgnored(command.ignore, transformed);
                                        this.setStates([module.name, controller.name, command.name].join('.'), transformed);
                                    })
                                    .catch((reason: any) => {
                                        this.log.error(reason);
                                    });

                                break;
                        }
                    });
                });
            });

            // Reset the connection indicator during startup
            this.setState('info.connection', true, true);
        } else {
            this.setState('info.connection', false, true);
        }
    }

    private setStates(parentName: string, transformed: object) {
        for (const [key, value] of Object.entries(transformed)) {
            const stateName = [parentName, key.toCamelCase()].join('.');
            if (isObject(value)) {
                this.setObjectNotExistsAsync(stateName, {
                    type: 'folder',
                    common: {
                        name: key,
                        read: true,
                        write: true
                    },
                    native: {}
                }).then(valueFolder => {
                    this.setStates(stateName, value);
                });
            } else if (isArray(value)) {
                this.setObjectNotExistsAsync(stateName, {
                    type: 'folder',
                    common: {
                        name: key + ' - array not implemented yet',
                        read: true,
                        write: true
                    },
                    native: {}
                }).then(valueFolder => {
                    // this.setStates(stateName, value);
                });
            } else {
                this.setObjectNotExistsAsync(stateName, {
                    type: 'state',
                    common: <ioBroker.StateCommon>{
                        name: key,
                        type: this.getObjectType(value), // role: "indicator",
                        read: true,
                        write: true
                    },
                    native: {}
                }).then(state => {
                    this.setStateAsync(stateName, value, true);
                });
            }
        }
    }

    private getObjectType(value: any) {
        // 'number' | 'string' | 'boolean' | 'array' | 'object' | 'mixed' | 'file';
        switch (typeof value) {
            case 'number':
            case 'string':
            case 'boolean':
                return typeof value;

            case 'bigint':
                return 'number';

            case 'object':
                if (isArray(value)) return 'array';
                else if (isObject(value)) return 'object';
            case 'undefined':
            case 'function':
            case 'symbol':
                return 'mixed';
        }
        return undefined;
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    // 	if (obj) {
    // 		// The object was changed
    // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    // 	} else {
    // 		// The object was deleted
    // 		this.log.info(`object ${id} deleted`);
    // 	}
    // }

    private removeIgnored(ignore: string[] | undefined, transformed: any) {
        if (isEmpty(ignore) || !isArray(ignore)) return transformed;

        for (const key in ignore) {
            delete transformed[key];
        }
        return transformed;
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === "object" && obj.message) {
    // 		if (obj.command === "send") {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info("send command");

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    // 		}
    // 	}
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Opnsense(options);
} else {
    // otherwise start the instance directly
    (() => new Opnsense())();
}