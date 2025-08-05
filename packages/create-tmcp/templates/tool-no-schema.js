server.tool(
	{
		name: 'example_tool',
		description: 'An example tool without schema validation',
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: 'This is an example tool!',
				},
			],
		};
	}
);