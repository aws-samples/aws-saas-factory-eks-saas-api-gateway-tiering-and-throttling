import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Injectable } from '@nestjs/common';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto.ts';

@Injectable()
export class UsersService {
  async createTenantUser(createTenantUserDto: CreateTenantUserDto) {
    const { userPoolId, email, companyName, tenantId, plan, apiKey, path } =
      createTenantUserDto;
    console.log('Adding tenant user with path', userPoolId, email, tenantId, path);
    let pathToUse;
    if(plan == 'basic')
      pathToUse = 'app'
    else
      pathToUse = path;
    const client = new CognitoIdentityProviderClient({});
    const cmd = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'custom:tenant-id', Value: tenantId },
        { Name: 'custom:company-name', Value: companyName },
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:plan', Value: plan },
        { Name: 'custom:api-key', Value: apiKey },
        { Name: 'custom:path', Value: pathToUse },
      ],
    });
    const res = await client.send(cmd);
    console.log('Successfully added user:', res.User);
  }
}
