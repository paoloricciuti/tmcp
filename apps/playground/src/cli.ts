#! /bin/env node

import { CliTransport } from '@tmcp/transport-cli';
import { server } from './index.ts';

const cli = new CliTransport(server);

await cli.run();
