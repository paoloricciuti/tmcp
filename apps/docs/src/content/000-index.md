---
title: Introduction
description: What and why is tmcp a thing?
section: Overview
---

If you are ever come close to the world of Agentic AI I'm sure you've come across a certain acronym: MCP.

## MCP: Model Context Protocol

As the name suggest Model Context Protocol is...well...a Protocol. Just like HTTP allow browsers (HTTP client) to communicate back and forth with our servers (HTTP server), MCP allows MCP clients to communicate back and forth with MCP servers. To do what? To allow LLMs (the Model in the acronym) to get additional Context (the Context in the acronym) and act on behalf of the user!

The MCP is a way to standardize the communication method between those clients (`claude-code`, `codex`, `copilot` etc) and the servers (what you are probably here to build).

The initiative was launched by Anthropic and quickly gained popularity and now has thousands of users.

If you are interested [you can read more here](https://modelcontextprotocol.io/docs/getting-started/intro) but you are here to learn about `tmcp` so...

## `tmcp` a modern way to build MCP servers

Most modern platform nowadays standardized on the `fetch` API to handle their requests/responses. SvelteKit, Next.js, SolidStart, Bun, Cloudflare Workers, Deno, they all handle HTTP calls in the same way: you expose a function that receives a `Request` instance and return a `Response` instance from it.

Simple, performant, modern.

There's also a lot of validation libraries out there: [Valibot](https://valibot.dev), [Arktype](https://arktype.io), [Effect](https://effect.website) each with it's own strength and as a library author you don't have to pick your favorite: you can use [Standard Schema](https://github.com/standard-schema/standard-schema) to allow your users to pick their favorite!

This and much more were the reasons that moved us to build `tmcp`: a simple, composable, modern and flexible SDK to build your MCP server where YOU get to pick your deployment target, you validation library and your preferred transport without all the rest coming as a baggage!

But enough blabblering...you want to see the code!
