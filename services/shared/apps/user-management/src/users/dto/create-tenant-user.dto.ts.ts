export class CreateTenantUserDto {
  userPoolId: string;
  email: string;
  tenantId: string;
  companyName: string;
  plan: string;
  apiKey: string;
  path: string;
}
