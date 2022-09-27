// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	interface String {
		toCamelCase() : string;
	}

	namespace ioBroker {
		interface AdapterConfig {
			OPNSense_ServerIp: string,
			apikey: string,
			apisecret: string,
		}
	}
}


// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};