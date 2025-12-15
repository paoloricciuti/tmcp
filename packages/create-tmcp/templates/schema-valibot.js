const ExampleSchema = v.object({
	name: v.pipe(v.string(), v.description('Name of the person')),
	age: v.pipe(v.number(), v.description('Age of the person')),
});
