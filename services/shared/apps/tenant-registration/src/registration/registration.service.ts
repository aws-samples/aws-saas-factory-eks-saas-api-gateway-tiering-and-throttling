/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import {
  CodePipelineClient,
  StartPipelineExecutionCommand,
} from '@aws-sdk/client-codepipeline';

import { CreateRegistrationDto } from './dto/create-registration.dto';
import { IdpService } from '../idp-service/idp.service';
import { Registration } from './entities/registration.entity';
import { ClientFactoryService } from 'libs/client-factory/src';
import { PLAN_TYPE } from '../models/types';
import { getTimeString } from '../utils/utils';
import { CREATE_TENANT_USER, USER_SERVICE } from './constants';
import { ClientProxy } from '@nestjs/microservices';
import {
  APIGatewayClient,
  CreateApiKeyCommand,
  CreateUsagePlanKeyCommand,
} from '@aws-sdk/client-api-gateway';

@Injectable()
export class RegistrationService {
  tableName: string = process.env.TENANT_TABLE_NAME;

  constructor(
    private clientFac: ClientFactoryService,
    private idpSvc: IdpService,
    @Inject(USER_SERVICE) private userSvc: ClientProxy,
  ) {}

  async create(dto: CreateRegistrationDto) {
    try {
      const apiKey_id = await this.createAPIKey(dto.companyName, dto.plan);
      const tenant = await this.store(dto, apiKey_id);
      this.register(tenant);
      this.provision(dto.plan);
    } catch (error) {
      console.error(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async store(dto: CreateRegistrationDto, apiKey_id: string) {
    const tenantId = uuid();
    const newTenant = new Registration(
      tenantId,
      dto.email,
      dto.plan,
      dto.companyName,
      apiKey_id,
    );
    const client = this.clientFac.client;
    const item = {
      tenant_id: newTenant.tenantId,
      email: newTenant.email,
      plan: newTenant.plan.toString(),
      companyName: newTenant.companyName,
      apiKey: apiKey_id,
    };
    const cmd = new PutCommand({
      Item: item,
      TableName: this.tableName,
    });
    const res = await client.send(cmd);
    return newTenant;
  }

  private async register(registration: Registration) {
    /* Comment the following line out to introduce siloed isolation */
    //const userPoolId = await this.idpSvc.getPooledUserPool();

    /* Uncomment the following 5 lines to introduce siloed isolation */
    const userPoolId = await this.idpSvc.getPlanBasedUserPool(
      registration.tenantId,
      registration.Path,
      registration.plan,
    );

    const user = {
      userPoolId: userPoolId.toString(),
      email: registration.email,
      tenantId: registration.tenantId,
      companyName: registration.companyName,
      plan: registration.plan,
      apiKey: registration.apiKey,
      path: registration.Path,
    };
    this.userSvc.send(CREATE_TENANT_USER, user).subscribe(
      (success) => console.log(success),
      (err) => console.log(err),
    );
  }
  private async createAPIKey(companyName: string, plan: PLAN_TYPE) {
    const client = this.clientFac.client;
    const cmd = new GetCommand({
      Key: {
        StackName: 'eks-saas',
      },
      TableName: 'EKS-SaaS-Stack-Metadata',
    });

    const item = await client.send(cmd);
    let usagePlanId;
    if (plan === PLAN_TYPE.Premium)
      usagePlanId = item.Item.Premium_UsagePlan_ID;
      else if (plan === PLAN_TYPE.Standard)
      usagePlanId = item.Item.Standard_UsagePlan_ID;
    else if (plan === PLAN_TYPE.Basic)
      usagePlanId = item.Item.Basic_UsagePlan_ID;

    const apigatewayClient = new APIGatewayClient({
      region: process.env.AWS_REGION,
    });
    const apiKeyCommand = new CreateApiKeyCommand({
      description: 'API Key for ' + companyName,
      enabled: true,
      name: companyName + '_APIKey',
    });
    const apikeyResponse = await apigatewayClient.send(apiKeyCommand);

    const apiKeyValue = apikeyResponse.value;
    const apiKeyId = apikeyResponse.id;
    const usagePlanKeyCommand = new CreateUsagePlanKeyCommand({
      keyId: apiKeyId,
      keyType: 'API_KEY',
      usagePlanId: usagePlanId,
    });
    const usagePlanKeyResponse = await apigatewayClient.send(
      usagePlanKeyCommand,
    );
    return apiKeyValue;
  }

  private async provision(plan: PLAN_TYPE) {
    if (plan !== PLAN_TYPE.Premium) {
      return;
    }
    const client = new CodePipelineClient({ region: process.env.AWS_REGION });

    const params = {
      name: 'eks-saas-tenant-onboarding-pipeline',
      clientRequestToken: 'requestToken-' + getTimeString(),
    };

    const command = new StartPipelineExecutionCommand(params);
    const response = await client.send(command);
    console.log('Successfully started pipeline. Response:', response);
  }
}
