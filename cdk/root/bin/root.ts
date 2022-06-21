#!/usr/bin/env node
import 'source-map-support/register';
import { RootStack } from '../lib/root-stack';
import { App } from 'aws-cdk-lib';

const app = new App();
new RootStack(app, 'RootStack');
