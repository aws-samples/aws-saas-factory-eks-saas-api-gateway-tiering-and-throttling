/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ClientFactoryService } from 'libs/client-factory/src';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  authTableName: string = process.env.AUTH_TENANT_TABLE_NAME;
  tableName: string = process.env.TENANT_TABLE_NAME;
  region: string = process.env.AWS_REGION;
  constructor(private clientFac: ClientFactoryService) {}

  async findAll() {
    const client = this.clientFac.client;
    try {
      const cmd = new ScanCommand({
        TableName: this.tableName,
      });
      const response = await client.send(cmd);
      return JSON.stringify(response.Items);
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

  findOne(id: number) {
    return `This action returns a #${id} tenant`;
  }

  update(id: number, updateTenantDto: UpdateTenantDto) {
    return `This action updates a #${id} tenant`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenant`;
  }

  async getAuthInfo(referer: string) {
    try {
      //grab the path of the referer header
      const path = this.getPath(referer);
      const client = this.clientFac.client;
      const cmd = new GetCommand({
        Key: {
          tenant_path: path,
        },
        TableName: this.authTableName,
      });
      const item = await client.send(cmd);
      return {
        aws_project_region: this.region,
        aws_cognito_region: this.region,
        aws_user_pools_id: item.Item.user_pool_id,
        aws_user_pools_web_client_id: item.Item.client_id,
      };
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

  getPath(referer: string) {
    const url = new URL(referer || 'http://localhost');
    const pathname = url.pathname;
    const regex = /\/?(\w+)(?:\/index\.html)?/gi;
    const matches = regex.exec(pathname);
    return (matches && matches[1]) || 'app';
  }
}
