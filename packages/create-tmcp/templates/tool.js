server.tool(
	{
		name: 'greet_person',
		description: 'Greet a person by name and age',
		schema: ExampleSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: `Hello ${input.name}! You are ${input.age} years old.`,
				},
			],
		};
	},
);
