/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
 
import {Duration, NestedStack, NestedStackProps, RemovalPolicy} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';


interface CdkApigatewayTsStackProps extends NestedStackProps {
  pooledTenantUserPoolArn: string;
  elbUrl: string;
}

export class CdkApigatewayTsStack extends NestedStack {

  restApi: apigateway.RestApi
  apiGatewayUrl: string
  basicUsagePlan: apigateway.UsagePlan
  standardUsagePlan: apigateway.UsagePlan
  premimumUsagePlan: apigateway.UsagePlan

  constructor(scope: Construct, id: string, props: CdkApigatewayTsStackProps) {
    super(scope, id, props);

    const restApi = new apigateway.RestApi(this, 'AnyCompanyRestAPI-CDK', {
      restApiName: 'AnyCompanyRestAPI-CDK',
      endpointConfiguration: {
        types: [ apigateway.EndpointType.REGIONAL ],
      },
      deployOptions: {
        stageName: 'prod',
      },
    });
    
    const authorizerLayer = new lambda.LayerVersion(this, 'AuthorizerLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda_authorizer/layer/')),
      description: 'Common Layer for Lambda Authorizer',
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
      removalPolicy: RemovalPolicy.DESTROY
    });

    const lambdaFunction = new lambda.Function(this, 'jwtauthorizer-lambda-function', {
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 256,
      timeout: Duration.seconds(5),
      handler: 'app.lambda_handler',
      layers: [authorizerLayer],
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda_authorizer/package')),
      environment: {
        REGION: NestedStack.of(this).region,
        AVAILABILITY_ZONES: JSON.stringify(
            NestedStack.of(this).availabilityZones,
        ),
      },
    });

    const dynamodbPolicy = new iam.PolicyStatement({
      actions: ['dynamodb:GetItem','dynamodb:Query'],
      resources: ['*'],
    });

    const lambdaPolicy = new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup','logs:CreateLogStream','logs:PutLogEvents'],
      resources: ['*'],
    });

    lambdaFunction.role?.attachInlinePolicy(
        new iam.Policy(this, 'list-buckets-policy', {
          statements: [dynamodbPolicy, lambdaPolicy],
        }),
    );

    const tokenAuthorizerProps: apigateway.TokenAuthorizerProps = {
      handler: lambdaFunction,
      authorizerName: 'JWTAuthorizer',
      resultsCacheTtl: Duration.minutes(5),
    };

    const authorizer = new apigateway.TokenAuthorizer(this, 'JWTAuthorizer-Pooled', tokenAuthorizerProps);

    //Usage Plans
    this.basicUsagePlan = restApi.addUsagePlan('BasicUsagePlan', {
      name: 'BasicUsagePlan',
      throttle: {
        rateLimit: 100,
        burstLimit: 200
      },
      quota: {
        limit: 500,
        period: apigateway.Period.DAY
      },
    });

    this.standardUsagePlan = restApi.addUsagePlan('StandardUsagePlan', {
      name: 'StandardUsagePlan',
      throttle: {
        rateLimit: 1000,
        burstLimit: 2000
      },
      quota: {
        limit: 5000,
        period: apigateway.Period.DAY
      },
    });
    
    this.premimumUsagePlan = restApi.addUsagePlan('PremiumUsagePlan', {
      name: 'PremiumUsagePlan',
      throttle: {
        rateLimit: 10000,
        burstLimit: 20000
      },
      quota: {
        limit: 50000,
        period: apigateway.Period.DAY
      },
    });

    this.basicUsagePlan.addApiStage({
      stage: restApi.deploymentStage,
    });
    
    this.standardUsagePlan.addApiStage({
      stage: restApi.deploymentStage,
    });

    this.premimumUsagePlan.addApiStage({
      stage: restApi.deploymentStage,
    })

    setupApplicationRestAPI(restApi, authorizer, props.elbUrl);

    this.restApi = restApi;

    this.apiGatewayUrl = `https://${restApi.restApiId}.execute-api.${this.region}.amazonaws.com/prod`;
  }
}

export function setupApplicationRestAPI(restApi: apigateway.RestApi, auth: apigateway.TokenAuthorizer, elbUrl: string) {

  const proxyPath = 'http://' + elbUrl + '/{proxy}'
  const proxy = restApi.root.addProxy({
    defaultMethodOptions: {
      requestParameters: {'method.request.path.proxy': true},
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: auth,
      apiKeyRequired: true,
    },
    defaultIntegration: new apigateway.HttpIntegration(proxyPath, {
      httpMethod: 'ANY',
      options: {
        requestParameters: {'integration.request.path.proxy': 'method.request.path.proxy'}
      },
    }),
    anyMethod: true,
  })

  addCorsOptions(proxy);
  restApi.methods.filter((method) => method.httpMethod === 'OPTIONS')
      .forEach((method) => {
        const methodCfn = method.node.defaultChild as apigateway.CfnMethod;
        methodCfn.authorizationType = apigateway.AuthorizationType.NONE;
        methodCfn.authorizerId = undefined;
        methodCfn.apiKeyRequired = false;
      })
}

export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'",
      },
    }],
    passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}
