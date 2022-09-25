'use strict';

/*
 * Created with @iobroker/create-adapter v2.0.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const { isEmpty, isArray, isObject } = require('./lib/tools')
const OPNSenseClient = require('./lib/opensense')
const config = require('./lib/config');
const opnsense = require('./apikey.json');
const { adapter } = require('@iobroker/adapter-core');
const interval = '10';

// Load your modules here, e.g.:
// const fs = require("fs");

class Opnsense extends utils.Adapter {

  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  constructor (options) {
    super({
      ...options, name: 'opnsense'
    });
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    // this.on("objectChange", this.onObjectChange.bind(this));
    // this.on("message", this.onMessage.bind(this));
    this.on('unload', this.onUnload.bind(this));
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady () {
    // Initialize folders

    config.modules && config.modules.forEach(module => {
      this.setObjectNotExistsAsync(module.name, {
        type: 'folder', common: {
          name: module.name, read: true, write: true
        }, native: {}
      }).then(moduleChannel => {
        module && module.controllers.forEach(controller => {
          this.setObjectNotExistsAsync(module.name + '.' + controller.name, {
            type: 'folder', common: {
              name: controller.name, read: true, write: true
            }, native: {}
          }).then(controllerChannel => {
            controller && controller.commands.forEach(command => {
              this.log.info('call ' + command.name);
              this.setObjectNotExistsAsync(module.name + '.' + controller.name + '.' + command.name, {
                type: 'channel', common: {
                  name: command.name, read: true, write: true
                }, native: {}
              })
            })
          })
        })
      })
    })

    let client = new OPNSenseClient(opnsense.key, opnsense.secret, 'https://192.168.40.174/api')

    config.modules && config.modules.forEach(module => {
      module && module.controllers.forEach(controller => {
        controller && controller.commands.forEach(command => {
          this.log.info('call ' + command.name);
          let url = command.url;
          if (isEmpty(url)) {
            url = `${module.name}/${controller.name}/${command.name}`.toLowerCase()
          }
          let method = command.method.toLowerCase() || 'get';

          switch (method) {
            case 'get':
              client.get(url)
                .then(async result => {
                  //this.log.debug(JSON.stringify(result))
                  let transformed = result;
                  if (typeof command.transform === 'function') {
                    transformed = command.transform(transformed);
                  }

                  transformed = this.removeIgnored(command.ignore, transformed)
                  this.setStates([ module.name, controller.name, command.name].join('.'), transformed);
                }).catch(reason => {
                this.log.error(reason)
              });

              break;
          }
        })
      })
    })

    // Reset the connection indicator during startup
    this.setState('info.connection', false, true);

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // this.config:
    // this.log.info("config option1: " + this.config.option1);
    // this.log.info("config option2: " + this.config.option2);

    /*
    For every state in the system there has to be also an object of type state
    Here a simple template for a boolean variable named "testVariable"
    Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
    // */
    // await this.setObjectNotExistsAsync("testVariable", {
    // 	type: "state",
    // 	common: {
    // 		name: "testVariable",
    // 		type: "boolean",
    // 		role: "indicator",
    // 		read: true,
    // 		write: true,
    // 	},
    // 	native: {},
    // });

    // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
    // this.subscribeStates("testVariable");
    // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
    // this.subscribeStates("lights.*");
    // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
    // this.subscribeStates("*");

    /*
      setState examples
      you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
    */
    // the variable testVariable is set to true as command (ack=false)
    // await this.setStateAsync("testVariable", true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    // await this.setStateAsync("testVariable", { val: true, ack: true });

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    // await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

    // examples for the checkPassword/checkGroup functions
    // let result = await this.checkPasswordAsync("admin", "iobroker");
    // this.log.info("check user admin pw iobroker: " + result);
    //
    // result = await this.checkGroupAsync("admin", "admin");
    // this.log.info("check group user admin group admin: " + result);
  }

  setStates (parentName, transformed) {
    for (const [ key, value ] of Object.entries(transformed)) {
      console.log(`${key}(${key.toCamelCase()}): ${value}`);
      const stateName = [ parentName, key.toCamelCase() ].join('.');
      if (isObject(value)) {
        this.setObjectNotExistsAsync(stateName, {
          type: 'folder', common: {
            name: key, read: true, write: true
          }, native: {}
        }).then(valueFolder => {
          this.setStates(stateName, value);
        });
      } else if (isArray(value)) {
        this.setObjectNotExistsAsync(stateName, {
          type: 'folder', common: {
            name: key + ' - array not implemented yet', read: true, write: true
          }, native: {}
        }).then(valueFolder => {
          // this.setStates(stateName, value);
        });
      } else {
        this.setObjectNotExistsAsync(stateName, {
          type: 'state', common: {
            name: key, type: this.getObjectType(value), // role: "indicator",
            read: true, write: true
          }, native: {}
        }).then(state => {
          this.setStateAsync(stateName, value, true)
        });
      }
    }
  }

  getObjectType (value) {
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

  removeIgnored (ignore, transformed) {
    if (isEmpty(ignore) || !isArray(ignore)) return transformed;

    for (const key in ignore) {
      delete transformed[ignore[key]];
    }
    return transformed;
  }

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload (callback) {
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

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  onStateChange (id, state) {
    if (state) {
      // The state was changed
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      // The state was deleted
      this.log.info(`state ${id} deleted`);
    }
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
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new Opnsense(options);
} else {
  // otherwise start the instance directly
  new Opnsense();
}
