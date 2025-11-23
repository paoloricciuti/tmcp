---
title: template
description: Learn how to register a new dynamic resource for your MCP server.
section: Core
---

<script>
	import { Callout } from "@svecodocs/kit";
</script>

Templates are the dynamic relatives of [resources](/docs/core/resource). They are resources at their heart but allow you to specify dynamic parts of the uri (just like you would do with a `/blog/{slug}` in an HTTP server).

They follow the same user flow as resources so the LLM is only involved as a recipient of them and doesn't autonomously pick them. Instead the user has to select the dynamic resources that it wish to include in the message which will then be sent as additional context for the LLM.

<Callout type="tip">

For illustration purpose we are not gonna use the [resource utilities](/docs/utils/resource) but you should definitely check them out as they would make the code much shorter.

</Callout>

## Basic API

You can register a template by invoking the `template` method on the server instance. The first argument is a configuration object and the second a handler that will be invoked whenever that resource is read by the MCP client.

```ts
server.template(
	{
		uri: 'mymcp://some-path/{name}.json',
		name: 'your-resource',
		description: 'A description for the LLM',
		title: 'Your Resource',
	},
	(uri) => {
		return {
			contents: [
				{
					uri,
					text: 'Content of the resource',
					mimeType: 'text/plain', // this is optional
				},
			],
		};
	},
);
```

`uri`, `name` and `description` are the only required properties (you can also specify a `title` for a human readable title but that's optional) of the configuration object. The return value of the handler must be an object with a `contents` property which is an array of one or more contents (you can refer to the [MCP spec](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#resource-contents) to know the possible return values).

The `uri` must conform to the [RFC3986](https://datatracker.ietf.org/doc/html/rfc3986) standard and it can be wether a common uri (like `https` or `git`) or it could be a custom one. The dynamic part must adhere to the [RFC6570](https://www.rfc-editor.org/rfc/rfc6570.html) standard.

## Read the dynamic parameters

## `enabled` function

One pattern that is quite common in every software is having a different feature-set based on some flag or the status of some user. You could technically create a new instance of the `McpServer` for each request and conditionally add a resource but to facilitate the process `tmcp` exposes an `enabled` property on the configuration object. The property is a function that returns a boolean and, as you might have guessed, allows you to include a specific resource in the list of resources conditionally. Within the function you have access to the [context](/docs/core/ctx) so you can make decisions based on the client capabilities, the client info or even just reading a feature flag in the db to do A/B testing or to allow your admin to turn on or off a resource without a re-deploy.

```ts
server.resource(
	{
		uri: 'mymcp://name-of-the-resource.json',
		name: 'your-resource',
		description: 'A description for the LLM',
		title: 'Your Resource',
		enabled() {
			return server.ctx.sessionInfo?.clientInfo?.name !== 'codex';
		},
	},
	(uri) => {
		return {
			contents: [
				{
					uri,
					text: 'Content of the resource',
					mimeType: 'text/plain', // this is optional
				},
			],
		};
	},
);
```

## Icons

To allow the users to to understand what an MCP server is about at a glance the MCP spec allows you to include a set of icons for each resource. Obviously `tmcp` allows you to specify those too using the `icons` property of the configuration object.

<Callout type="note">

MCP clients are usually very strict about which icons they do or don't display. If your server is remote they'll only display remote icons served by the same domain or `data` images, if it's local they'll only display local files or `data` images. We suggest to include more icons and to properly test them with various clients.

</Callout>

```ts
server.resource(
	{
		uri: 'mymcp://name-of-the-resource.json',
		name: 'your-resource',
		description: 'A description for the LLM',
		title: 'Your Resource',
		icons: [
			{
				src: 'https://dantemcp.com/date.png',
			},
			{
				src: 'data:image/png;base64,...',
			},
		],
	},
	(uri) => {
		return {
			contents: [
				{
					uri,
					text: 'Content of the resource',
					mimeType: 'text/plain', // this is optional
				},
			],
		};
	},
);
```

## Dynamic Resources

The `resource` method is only used to add static resources to your MCP server, to learn how to add dynamic resources please check out the [template](/docs/core/template) documentation.
