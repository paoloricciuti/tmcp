const ExampleSchema = z.object({
	name: z.string().describe('Name of the person'),
	age: z.number().describe('Age of the person'),
});
