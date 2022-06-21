/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

import {Match } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as Eks from '../lib/eks-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Eks.EksStack(app, 'MyTestStack');
  // THEN
  expect(stack).toEqual(
    Match.objectEquals(
      {
        Resources: {},
      },
    )
  );
});
