/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

import parseUrl from 'parse-url';
import { DurableObject } from 'cloudflare:workers';

/**
 * Associate bindings declared in wrangler.toml with the TypeScript type system
 */
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	COUNTERS: DurableObjectNamespace<Counter>;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class Counter  extends DurableObject{
	async getCounterValue(){
		return (await this.ctx.storage.get<number>("value")) || 0
	}
	async increment(amount=1){
		let value = (await this.ctx.storage.get<number>("value")) || 0;
		value += amount;
		await this.ctx.storage.put<number>("value", value);
		return value;
	}
	async decrement(amount=1){
		let value = (await this.ctx.storage.get<number>("value")) || 0;
		value -= amount;
		await this.ctx.storage.put<number>("value", value);
		return value;
	}
	/**
	 * The Durable Object fetch handler will be invoked when a Durable Object instance receives a
	 * 	request from a Worker via an associated stub
	 *
	 * @param request - The request submitted to a Durable Object instance from a Worker
	 * @returns The response to be sent back to the Worker
	 */
	async fetch(request: Request): Promise<Response> {
		let params = parseUrl(request.url)
		console.log(params)
		return new Response('Hello World');
	}
}

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// We will create a `DurableObjectId` using the pathname from the Worker request
		// This id refers to a unique instance of our 'MyDurableObject' class above
		let url = new URL(request.url);
		console.log(url.searchParams)
		let name = url.searchParams.get('name');
		if(!name){
				return new Response('Please enter a valid name');
		}

		let id = env.COUNTERS.idFromName(name);

		// This stub creates a communication channel with the Durable Object instance
		// The Durable Object constructor will be invoked upon the first call for a given id
		let stub = env.COUNTERS.get(id);

		// We call `fetch()` on the stub to send a request to the Durable Object instance
		// The Durable Object instance will invoke its fetch handler to handle the request
		let count = null;
		console.log(url.pathname)
		switch(url.pathname){
			case "/increment":
				count = await stub.increment();
				break;
			case "/decrement":
				count = await stub.decrement();
				break;
			case "/":
				count = await stub.getCounterValue();
				break;

			default:
				return new Response('Not Found',{status:404});

		}
		return new Response(`Durable Object '${name}' count: ${count}`);
	},
};
