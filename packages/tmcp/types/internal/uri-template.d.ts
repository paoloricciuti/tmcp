// Helper type to remove whitespace
type Trim<S extends string> = S extends ` ${infer R}`
	? Trim<R>
	: S extends `${infer L} `
		? Trim<L>
		: S;

// Helper type to extract variable name, removing modifiers
type ExtractVarName<S extends string> = S extends `${infer Name}:${string}`
	? Trim<Name> // Remove prefix modifier
	: S extends `${infer Name}*`
		? Trim<Name> // Remove explode modifier
		: Trim<S>;

// Helper type to split comma-separated variables
type SplitVariables<S extends string> = S extends `${infer First},${infer Rest}`
	? ExtractVarName<First> | SplitVariables<Rest>
	: ExtractVarName<S>;

// Helper type to extract content from braces and handle operators
type ExtractFromExpression<S extends string> = S extends `+${infer Vars}`
	? SplitVariables<Vars> // Reserved {+var}
	: S extends `#${infer Vars}`
		? SplitVariables<Vars> // Fragment {#var}
		: S extends `.${infer Vars}`
			? SplitVariables<Vars> // Label {.var}
			: S extends `/${infer Vars}`
				? SplitVariables<Vars> // Path {/var}
				: S extends `;${infer Vars}`
					? SplitVariables<Vars> // Path-style {;var}
					: S extends `?${infer Vars}`
						? SplitVariables<Vars> // Query {?var}
						: S extends `&${infer Vars}`
							? SplitVariables<Vars> // Query continuation {&var}
							: SplitVariables<S>; // Simple {var}

// Main recursive type to extract all variables from URI template
type ExtractVariablesFromTemplate<S extends string> =
	S extends `${string}{${infer Expression}}${infer Rest}`
		? ExtractFromExpression<Expression> | ExtractVariablesFromTemplate<Rest>
		: never;

// Main exported type
export type ExtractURITemplateVariables<T extends string> =
	ExtractVariablesFromTemplate<T>;
