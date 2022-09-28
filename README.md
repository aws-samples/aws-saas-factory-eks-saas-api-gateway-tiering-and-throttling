# SaaS Factory EKS SaaS API Gateway Tiering and Throttling

The code provided here is intended to accompany the AWS Blog - Enabling Tiering and Throttling in a Multi-tenant Amazon EKS SaaS solution using Amazon API Gateway. The working example is built on top of the EKS SaaS Workshop by SaaS Factory.  The working example demonstrates throttling strategy for different tiers through the usage of API Gateway, Usage Plans, and API Keys.  API Gateway will be provisioned in front of a EKS cluster and all requests will be evaluated before being passed through to the EKS cluster.


## Step by step instructions

Follow the instructions in the below link to get started:

https://catalog.us-east-1.prod.workshops.aws/workshops/e04c0885-830a-479b-844b-4c7af79697f8/en-US/lab-0/2-on-your-own

## NOTE: You will have to clone this repo instead of the one mentioned in the below link.
https://catalog.us-east-1.prod.workshops.aws/workshops/e04c0885-830a-479b-844b-4c7af79697f8/en-US/lab-0/2-on-your-own/6-clone-repo

Make sure you clone the below repo and continue with the rest of the steps.  You will also need to change the name of the home directory for the project as you follow the direction.

git clone https://github.com/aws-samples/aws-saas-factory-eks-saas-api-gateway-tiering-and-throttling.git

## API Gateway

As part of the throttling solution, we added an API Gateway along with usage plans to the SaaS Factory EKS SaaS Workshop.  
We provisioned API Gateway as part of the root stack when setting up the workshop.

Besides usage plans and API Gateway, we also created a lambda authorizer to be used by API Gateway to validate JWT Token from Amazon Cognito.

You will find:
cdk code for API Gateway: **/aws-saas-factory/eks-saas-api-gateway-tiering-and-throttling/cdk/root/lib/apigateway-stack/**
lambda authorizer: **/aws-saas-factory/eks-saas-api-gateway-tiering-and-throttling/cdk/lambda_authorizer/package/app.py**

This project also updated **/aws-saas-factory/eks-saas-api-gateway-tiering-and-throttling/root-stack.ts** to manage the execution of apigateway-stack

## API Key - Onboarding
In order to enforce a usage plan, we are assigning an API Key per tenant and storing the API Key as a custom claim for the user within Amazon Cognito.

The API Key is created during the onboarding process for a new tenant. The code can be found in:
**/aws-saas-factory/eks-saas-api-gateway-tiering-and-throttling/services/shared/apps/tenant-registration/src/registration/registeration.service.ts**

## JWT Token - Requests
Once we have an API Key created for the tenant, any users associated with the tenant will have the API Key as part of the custom claim, which is included in the JWT Token.

When a user logs into the web application and submits a request, the request will contain the API Key within the header so API Gateway can enforce usage plans and provide throttling for the requests.

You can find the code that sets the API Key in the requests in:
**/aws-saas-factory/eks-saas-api-gateway-tiering-and-throttling/client/web/application/src/app/interceptors/auth.interceptors.ts**

