import Yargs from 'yargs/yargs';

await Yargs(process.argv.slice(2))
	.command('test', 'Run tests', {}, console.log)
	.parseAsync();
