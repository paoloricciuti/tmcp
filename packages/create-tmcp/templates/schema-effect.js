const ExampleSchema = S.Struct({
	name: S.String.annotations({ description: 'Name of the person' }),
	age: S.Number.annotations({ description: 'Age of the person' }),
});