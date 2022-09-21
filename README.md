# SaaS Factory EKS SaaS API Gateway Tiering and Throttling

The code provided here is intended to accompany the AWS Blog - Enabling Tiering and Throttling in a Multi-tenant Amazon EKS SaaS solution using Amazon API Gateway. The working example is built on top of the EKS SaaS Workshop by SaaS Factory.  The working example demonstrates throttling strategy for different tiers through the usage of API Gateway, Usage Plans, and API Keys.  API Gateway will be provisioned in front of a EKS cluster and all requests will be evaluated before being passed through to the EKS cluster.


## Step by step instructions

Follow the instructions in the below link to get started:

https://catalog.us-east-1.prod.workshops.aws/workshops/e04c0885-830a-479b-844b-4c7af79697f8/en-US/lab-0/2-on-your-own

## NOTE: You will have to clone this repo instead of the one mentioned in the below link.
https://catalog.us-east-1.prod.workshops.aws/workshops/e04c0885-830a-479b-844b-4c7af79697f8/en-US/lab-0/2-on-your-own/6-clone-repo

Make sure you clone the below repo and continue with the rest of the steps.

git clone https://github.com/aws-samples/aws-saas-factory-eks-saas-api-gateway-tiering-and-throttling.git

