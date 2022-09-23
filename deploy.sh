#!/bin/bash

# This will load the values for ELBURL, CODEBUILD_ARN and IAM_ROLE_ARN in to the Cloud9 terminal's shell
source ~/.bash_profile

nvm use 16

if [ "X$1" = "X" ]; then
    echo "usage: $0 ADMIN_EMAIL_ADDR (ex. $0 admin@email.com)"
    exit 2
fi
ADMIN_EMAIL_ADDR=$1

#Create CodeCommit repo
export AWS_PAGER=""
REGION=$(aws configure get region)
aws codecommit get-repository --repository-name aws-saas-factory-eks-workshop
if [[ $? -ne 0 ]]; then
     echo "aws-saas-factory-eks-workshop codecommit repo is not present, will create one now"
     aws codecommit create-repository --repository-name aws-saas-factory-eks-workshop --repository-description "CodeCommit repo for SaaS Factory EKS Workshop"
fi

REPO_URL="codecommit::${REGION}://aws-saas-factory-eks-workshop"
git remote add cc $REPO_URL
if [[ $? -ne 0 ]]; then
    echo "Setting url to remote cc"
    git remote set-url cc $REPO_URL
fi
pip3 install git-remote-codecommit    
git push --set-upstream cc main --force
git remote rm cc
git branch -u origin/main main

mkdir -p cdk/lambda_authorizer/layer/python
cd cdk/lambda_authorizer/layer/python
pip3 install -t . urllib3
pip3 install -t . python-jose

cd ../../../root
yarn && yarn run build
cdk bootstrap  
cdk deploy \
  --parameters eksElbUrl=$ELBURL \
  --parameters eksCodeBuildArn=$CODEBUILD_ARN \
  --parameters adminEmailAddr=$ADMIN_EMAIL_ADDR \

if [[ $? -ne 0 ]]; then
    exit 1
fi

AUTH_INFO_TABLE=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='AuthInfoTable'].OutputValue" --output text)
POOLED_TENANT_USERPOOL_ID=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='PooledTenantUserPoolId'].OutputValue" --output text)
POOLED_TENANT_APPCLIENT_ID=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='PooledTenantAppClientId'].OutputValue" --output text)
EKSSAAS_STACKMETADATA_TABLE=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='EksSaaSStackMetadataTable'].OutputValue" --output text)
export REST_API_URL=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='ApiURL'].OutputValue" --output text)
API_ID=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='restApiId'].OutputValue" --output text)
BASIC_USAGEPLAN_ID=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='BasicUsagePlanId'].OutputValue" --output text)
STANDARD_USAGEPLAN_ID=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='StandardUsagePlanId'].OutputValue" --output text)
PREMIUM_USAGEPLAN_ID=$(aws cloudformation describe-stacks --stack-name RootStack --query "Stacks[0].Outputs[?OutputKey=='PremiumUsagePlanId'].OutputValue" --output text)

echo "export REST_API_URL=${REST_API_URL}" | tee -a ~/.bash_profile

aws dynamodb put-item \
--table-name ${AUTH_INFO_TABLE} \
--item "{\"tenant_path\": {\"S\": \"app\"}, \"user_pool_type\": {\"S\": \"pooled\"}, \"user_pool_id\": {\"S\": \"$POOLED_TENANT_USERPOOL_ID\"}, \"client_id\": {\"S\": \"$POOLED_TENANT_APPCLIENT_ID\"}}" \
--return-consumed-capacity TOTAL        

# Record the EKS SaaS stack metadata in the dynamo table that was made in root-stack
aws dynamodb put-item \
--table-name $EKSSAAS_STACKMETADATA_TABLE \
--item "{\"StackName\": {\"S\": \"eks-saas\"}, \"ELBURL\": {\"S\": \"$ELBURL\"}, \"API_URL\": {\"S\": \"$API_URL\"}, \"API_ID\": {\"S\": \"$API_ID\"}, \"Premium_UsagePlan_ID\": {\"S\": \"$PREMIUM_USAGEPLAN_ID\"}, \"Standard_UsagePlan_ID\": {\"S\": \"$STANDARD_USAGEPLAN_ID\"}, \"Basic_UsagePlan_ID\": {\"S\": \"$BASIC_USAGEPLAN_ID\"}, \"CODEBUILD_ARN\": {\"S\": \"$CODEBUILD_ARN\"}, \"IAM_ROLE_ARN\": {\"S\": \"$IAM_ROLE_ARN\"}}" \
--return-consumed-capacity TOTAL